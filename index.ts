
import { ContainmentResult, solveShapeQueryContainment } from "query-shape-detection";
import { markdownTable } from 'markdown-table'
import { prepareQueries, prepareShapes, getQueryTable, toObject } from './helper';
import { join } from 'node:path';
import * as fs from "node:fs/promises";

const queries_directory = "./queries";
const result_directory = "./results";
const shape_directory = "./shapes";

const COMPLETE_RESULT_LABEL ="Complete results";

const query_map = await prepareQueries(queries_directory);
const shapes = await prepareShapes(shape_directory);



const label_column: string[] = ["query"].concat(shapes.map((shape) => shape.name)).concat(COMPLETE_RESULT_LABEL);


const table: string[][] = [label_column];
console.log('-----');
const current_result_folder = join(result_directory, "basic_shapes");
if (! await (fs.exists(current_result_folder))) {
    await fs.mkdir(current_result_folder);
}

for (const [query_name, query] of query_map) {
    console.log(`Query ${query_name} report created`);
    const res = solveShapeQueryContainment({ query, shapes });
    await Bun.write(join(current_result_folder, `${query_name}.json`), JSON.stringify(toObject(res), (key, value)=>{
        if(key==="result"){
            return ContainmentResult[value];
        }
        return value;
    }, 2));
    const [query_table, allContained] = getQueryTable(res,shapes);
    const column: string[] = [query_name];
    for (const shape of shapes) {
        column.push(query_table.get(shape.name)!);
    }
    column.push(String(allContained));
    table.push(column);
}
const markdown_table = markdownTable(table);
await Bun.write(join(current_result_folder, 'table.md'), markdown_table);
console.log('-----');




