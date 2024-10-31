import { JsonLdParser } from "jsonld-streaming-parser";
import * as fs from "node:fs/promises";
import { join } from 'node:path';
import {
    type IShape,
    shapeFromQuads,
    type IQuery,
    generateQuery,
    IResult,
    ContainmentResult
} from "query-shape-detection";
import type * as RDF from '@rdfjs/types';
import * as ShexParser from '@shexjs/parser';
import { translate } from "sparqlalgebrajs";

const SHEX_CONTEXT = JSON.parse((await fs.readFile('./shex_context.json')).toString());

export async function prepareQueries(queries_directory: string): Promise<[string, IQuery][]> {
    const query_map: [string, IQuery][] = [];
    const files = (await fs.readdir(queries_directory)).sort();
    for (const file of files) {
        const file_without_extension = file.substring(0, Math.max(file.indexOf('.'), 0));
        const text = (await fs.readFile(join(queries_directory, file))).toString();
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
        let shapeShexc = (await fs.readFile(join(shape_directory, file))).toString();
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

export function getQueryTable(res: IResult, allShapes: IShape[]): [Map<string, string>, boolean] {
    const alignment = new Map<string, string>();
    let allContained = true;
    for (const result of res.starPatternsContainment.values()) {
        for (const target of result.target ?? []) {
            alignment.set(target, String(true))
        }
        if (result.result === ContainmentResult.ALIGNED || (result.result === ContainmentResult.DEPEND && result.target === undefined)) {
            allContained = false;
        }
    }
    for (const shape of allShapes) {
        if (!alignment.has(shape.name)) {
            alignment.set(shape.name, String(false));
        }
    }
    return [alignment, allContained];
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

export function toObject(result: IResult): any {
    const res: any = {
        ...result
    };
    const visitShapeBoundedResource = Object.fromEntries(
        Array.from(res.visitShapeBoundedResource.entries()
            , ([k, v]) =>
                v instanceof Map
                    ? [k, toObjectInner(v)]
                    : [k, v])
    );
    const starPatternsContainment = Object.fromEntries(
        Array.from(res.starPatternsContainment.entries()
            , ([k, v]) =>
                v instanceof Map
                    ? [k, toObjectInner(v)]
                    : [k, v])
    );
    res.visitShapeBoundedResource = visitShapeBoundedResource;
    res.starPatternsContainment = starPatternsContainment;
    return res;
}

function toObjectInner(map: Map<any, any>): Map<any, any> {
    return Object.fromEntries(Array.from(map.entries(), ([k, v]) =>
        v instanceof Map
            ? [k, toObjectInner(v)]
            : [k, v]
    )
    )
}
