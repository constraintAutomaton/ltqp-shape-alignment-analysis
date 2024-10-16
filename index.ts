import { prepareQueries, prepareShapes } from './helper';
import { containmentAnalysis } from './task';

const queries_directory = "./queries";
const result_directory = "./results";
const shape_directory = "./shapes/fully_bounded";


const query_map = await prepareQueries(queries_directory);
const shapes = await prepareShapes(shape_directory);

await containmentAnalysis({ values: shapes, label: "basic_shapes" }, result_directory, query_map);




