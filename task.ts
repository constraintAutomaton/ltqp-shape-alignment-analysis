import { IQuery, IShape } from "query-shape-detection";
import { ContainmentResult, solveShapeQueryContainment } from "query-shape-detection";
import { markdownTable } from 'markdown-table'
import { getQueryTable, toObject } from './helper';
import { join } from 'node:path';
import * as fs from "node:fs/promises";

export async function containmentAnalysis(shapes: {values: IShape[], label:string}, result_directory: string, query_map: [string, IQuery][]) {
    const COMPLETE_RESULT_LABEL = "a priori complete search space";

    const label_column: string[] = ["query"].concat(shapes.values.map((shape) => shape.name)).concat(COMPLETE_RESULT_LABEL);


    const table: string[][] = [label_column];
    console.log('-----');
    const current_result_folder = join(result_directory, shapes.label);
    if (!await (fs.exists(current_result_folder))) {
        await fs.mkdir(current_result_folder);
    }

    for (const [query_name, query] of query_map) {
        console.log(`Query ${query_name} report created`);
        const res = solveShapeQueryContainment({ query, shapes:shapes.values });
        await Bun.write(join(current_result_folder, `${query_name}.json`), JSON.stringify(toObject(res), (key, value) => {
            if (key === "result") {
                return ContainmentResult[value];
            }
            return value;
        }, 2));
        const [query_table, allContained] = getQueryTable(res, shapes.values);
        const column: string[] = [query_name];
        for (const shape of shapes.values) {
            column.push(query_table.get(shape.name)!);
        }
        column.push(String(allContained));
        table.push(column);
    }
    const markdown_table = markdownTable(table);
    await Bun.write(join(current_result_folder, 'table.md'), markdown_table);
    console.log('-----');
}