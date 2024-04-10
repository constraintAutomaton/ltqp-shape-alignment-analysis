import { JsonLdParser } from "jsonld-streaming-parser";
import * as fs from "node:fs/promises";
import { join } from 'node:path';
import {
    type IShape,
    shapeFromQuads,
    type Query,
    generateQuery,
    IResult,
    AlignmentType
} from "query-shape-detection";
import type * as RDF from '@rdfjs/types';
import * as ShexParser from '@shexjs/parser';
import { translate } from "sparqlalgebrajs";

import * as SHEX_CONTEXT from './shex_context.json';

export async function prepareQueries(queries_directory: string, _result_directory: string): Promise<[string, Query][]> {
    const query_map: [string, Query][] = [];
    const files =  (await fs.readdir(queries_directory)).sort();
    for (const file of files) {
        const file_without_extension = file.substring(0, Math.max(file.indexOf('.'), 0));
        const text = await (Bun.file(join(queries_directory, file)).text());
        try {
            const query = generateQuery(translate(text));
            query_map.push([file_without_extension, query]);
        } catch (error) {
            console.error(`the file ${file} has an error`);
            throw error;
        }
    }
    return query_map
}

export async function prepareShapes(shape_directory: string): Promise<IShape[]> {
    const shapes: IShape[] = [];

    for (const file of await fs.readdir(shape_directory)) {
        const shape_name = `http://exemple.ca/${file}`;
        const shexParser = ShexParser.construct(shape_name);
        let shapeShexc = await Bun.file(join(shape_directory, file)).text();
        shapeShexc = shapeShexc.replace('$', shape_name);
        const shapeJSONLD = shexParser.parse(shapeShexc);
        const stringShapeJsonLD = JSON.stringify(shapeJSONLD);
        const shexShapeQuads = await parseShexShape(stringShapeJsonLD);

        const shape = await shapeFromQuads(shexShapeQuads, shape_name);
        if (shape instanceof Error) {
            throw shape;
        }
        shapes.push(shape);
    }
    return shapes;
}

export function getQueryTable(res: IResult): Map<string, string> {
    const alignment: Map<string, string> = new Map();
    for (const table_entry of res.alignedTable.values()) {
        for (const [shape_name, shape_result] of table_entry) {
            const alignment_result = alignment.get(shape_name);
            const current_shape_result_string = alignmentTypeToString(shape_result);
            if (alignment_result === undefined) {
                alignment.set(shape_name, current_shape_result_string);
            }
            if (alignment_result === alignmentTypeToString(AlignmentType.None)) {
                alignment.set(shape_name, current_shape_result_string)
            }
        }
    }
    return alignment;
}

export function alignmentTypeToString(alignment: AlignmentType): string {
    switch (alignment) {
        case AlignmentType.None:
            return "None";
        case AlignmentType.STRONG:
            return "Strong";
        case AlignmentType.WEAK:
            return "Weak"
    }
}

export function parseShexShape(stringShapeJsonLD: string): Promise<RDF.Quad[]> {
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

export function replacer(key: any, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

export function toObject(result: IResult): any {
    const res: any = {
        ...result
    };
    const aligned_table = Object.fromEntries(
        Array.from(res.alignedTable.entries()
            , ([k, v]) =>
                v instanceof Map
                    ? [k, toObjectInner(v)]
                    : [k, v])
    )
    res.alignedTable = aligned_table;
    return res;
}

function toObjectInner(map: Map<any, any>): Map<any, any> {
    return Object.fromEntries
        (Array.from
            (map.entries()
                , ([k, v]) =>
                    v instanceof Map
                        ? [k, toObjectInner(v)]
                        : [k, v]
            )
        )
}
