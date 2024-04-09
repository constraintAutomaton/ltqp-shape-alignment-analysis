import { JsonLdParser } from "jsonld-streaming-parser";
import { readdir } from "node:fs/promises";
import { join } from 'node:path';
import { type IShape, shapeFromQuads, type Query, generateQuery, reportAlignment, IOptions, IResult, AlignmentType } from "query-shape-detection";
import type * as RDF from '@rdfjs/types';
import * as ShexParser from '@shexjs/parser';
import { translate } from "sparqlalgebrajs";
import { markdownTable } from 'markdown-table'

import * as SHEX_CONTEXT from './shex_context.json';

const queries_directory = "./queries";
const query_map: Map<string, Query> = new Map();

for (const file of await readdir(queries_directory)) {
    const text = await (Bun.file(join(queries_directory, file)).text());
    try {
        const query = generateQuery(translate(text));
        query_map.set(file, query);
    } catch (error) {
        console.error(`the file ${file} has an error`);
        throw error;
    }
}

const shape_directory = "./shapes";
const shapes: IShape[] = [];

for (const file of await readdir(shape_directory)) {
    const shape_name = `http://exemple.ca/${file}`;
    const shexParser = ShexParser.construct(shape_name);
    let shapeShexc = await Bun.file(join(shape_directory, file)).text();
    shapeShexc = shapeShexc.replace('$', shape_name);
    const shapeJSONLD = shexParser.parse(shapeShexc);
    const stringShapeJsonLD = JSON.stringify(shapeJSONLD);
    const shexShapeQuads = await parseShexShape(stringShapeJsonLD);

    const shape = await shapeFromQuads(shexShapeQuads, shape_name);
    if (shape instanceof Error) {
        throw shape
    }
    shapes.push(shape);
}

const option: IOptions = {
    shapeIntersection: true
};
let i = 0;
for (const [query_name, query] of query_map) {
    console.log(query_name);
    const res = reportAlignment({ query, shapes, option });
    console.log(getQueryTable(res));
}

function getQueryTable(res: IResult): Map<string, string> {
    const alignment: Map<string, string> = new Map();
    for (const table_entry of res.alignedTable.values()) {
        for (const [shape_name, shape_result] of table_entry) {
            const alignment_result = alignment.get(shape_name);
            const current_shape_result_string = alignmentTypeToString(shape_result);
            if (alignment_result === undefined) {
                alignment.set(shape_name, current_shape_result_string);
            }
            if(alignment_result === alignmentTypeToString(AlignmentType.None)){
                alignment.set(shape_name, current_shape_result_string)
            }
        }
    }
    return alignment;
}
function alignmentTypeToString(alignment: AlignmentType): string {
    switch (alignment) {
        case AlignmentType.None:
            return "None";
        case AlignmentType.STRONG:
            return "Strong";
        case AlignmentType.WEAK:
            return "Weak"
    }
}
function parseShexShape(stringShapeJsonLD: string): Promise<RDF.Quad[]> {
    return new Promise((resolve, reject) => {
        const jsonldParser = new JsonLdParser({
            streamingProfile: false,
            context: SHEX_CONTEXT,
            skipContextValidation: true,
        });

        const quads: RDF.Quad[] = [];

        jsonldParser
            .on('data', async (quad: RDF.Quad) => {
                quads.push(quad);
            })
            .on('error', /* istanbul ignore next */(error: any) => {
                reject(error);
            })
            .on('end', async () => {
                resolve(quads);
            });

        jsonldParser.write(stringShapeJsonLD);
        jsonldParser.end();
    });

}