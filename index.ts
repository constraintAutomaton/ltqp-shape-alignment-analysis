
import { reportAlignment, IOptions } from "query-shape-detection";
import { markdownTable } from 'markdown-table'
import { prepareQueries, prepareShapes, getQueryTable, replacer, toObject } from './helper';
import { join } from 'node:path';
import * as fs from "node:fs/promises";

const queries_directory = "./queries";
const result_directory = "./results";
const shape_directory = "./shapes";

const query_map = await prepareQueries(queries_directory, result_directory);
const shapes = await prepareShapes(shape_directory);

const config: [string, IOptions][] = [
    ["naive", {}],
    ["shapeIntersection",
        {
            shapeIntersection: true
        }
    ],
    ["strongAlignment",
        {
            strongAlignment: true
        }
    ],
    [
        'all',
        {
            strongAlignment: true,
            shapeIntersection: true
        }
    ]
];

const label_column: string[] = ["query"].concat(shapes.map((shape) => shape.name));


for (const [approach, option] of config) {
    const table: string[][] = [label_column];
    console.log(`Approach ${approach} started`);
    const current_result_folder = join(result_directory, approach);
    if (! await (fs.exists(current_result_folder))) {
        await fs.mkdir(current_result_folder);
    }
    let i = 0;

    for (const [query_name, query] of query_map) {
        console.log(`Query ${query_name} report created`);
        const res = reportAlignment({ query, shapes, option });
        await Bun.write(join(current_result_folder, `${query_name}.json`), JSON.stringify(toObject(res), null, 2));
        const query_table = getQueryTable(res);
        const column: string[] = [query_name];
        for (const shape of shapes) {
            column.push(query_table.get(shape.name)!);
        }
        table.push(column);
        i += 1;
        //if (i == 3) break;
        
    }
    const markdown_table = markdownTable(table);
    await Bun.write(join(current_result_folder, 'table.md'), markdown_table);
    console.log(markdown_table);
    console.log('-----');
}



