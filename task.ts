import { IQuery, IShape } from "query-shape-detection";
import { ContainmentResult, solveShapeQueryContainment } from "query-shape-detection";
import { markdownTable } from 'markdown-table'
import { getQueryTable, toObject } from './helper';
import { join } from 'node:path';
import * as fs from "node:fs/promises";
export async function containmentAnalysis(shapes: { values: IShape[], label: string }, result_directory: string, query_map: [string, IQuery][]) {
    const COMPLETE_RESULT_LABEL = "Search domain knowledge";

    const label_column: string[] = ["query"].concat(shapes.values.map((shape) => shape.name)).concat(COMPLETE_RESULT_LABEL);


    const table: string[][] = [label_column];
    console.log('-----');
    const current_result_folder = join(result_directory, shapes.label);
    try {
        await fs.access(current_result_folder)
    } catch {
        await fs.mkdir(current_result_folder);
    }

    for (const [query_name, query] of query_map) {
        console.log(`Query ${query_name} report created`);
        const res = solveShapeQueryContainment({ query, shapes: shapes.values });
        await fs.writeFile(join(current_result_folder, `${query_name}.json`), JSON.stringify(toObject(res), (key, value) => {
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
    await fs.writeFile(join(current_result_folder, 'table.md'), markdown_table);
    console.log('-----');
}

export async function timeEval(shapes: { values: IShape[], label: string }, result_directory: string, query_map: [string, IQuery][], nRepetition: number, warmUp: boolean = false, hadWarmUp: boolean = false) {
    console.log('-----');
    const current_result_folder = join(result_directory, shapes.label);
    try {
        await fs.access(current_result_folder)
    } catch {
        await fs.mkdir(current_result_folder);
    }

    const results: Record<string, IEvalResult> = {};
    for (const [query_name, query] of query_map) {
        const times = [];
        for (let i = 0; i < nRepetition; i++) {
            const start = performance.now();
            const _ = solveShapeQueryContainment({ query, shapes: shapes.values });
            const end = performance.now();
            times.push(end - start);
        }
        const average = times.reduce((acc, current) => acc + current) / times.length;
        const std = Math.sqrt(times.reduce((acc, current) => acc + Math.pow(current - average, 2)) / (times.length - 1));
        results[query_name] = {
            times,
            average,
            std,
            max: Math.max(...times),
            min: Math.min(...times),
        };
        console.log(`Query ${query_name} time evaluated`);
    }
    if (!warmUp) {
        await fs.writeFile(join(current_result_folder, `time_eval${hadWarmUp ? "_with_warm_up" : ""}.json`), JSON.stringify(results, null, 2));

        await fs.writeFile(join(current_result_folder, `time_eval_summary${hadWarmUp ? "_with_warm_up" : ""}.json`), JSON.stringify(results, (key: string, value: unknown) => {
            if (key == "times") {
                return undefined;
            } else {
                return value;
            }
        }, 2));
    }
}

interface IEvalResult {
    times: number[];
    average: number;
    std: number;
    max: number;
    min: number;
}