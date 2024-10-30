import { prepareQueries, prepareShapes } from './helper';
import { containmentAnalysis, timeEval } from './task';
import { Command } from 'commander';

const program = new Command();
program
    .name('query-shape-alignment-analysis')
    .option('-w, --warmUp', 'Should warm up for the time experiment', false)
    .option('-t, --timeExperiment', 'Should execute the time experiments', false)
    .option('-a, --alignmentExperiment', 'Should execute the aligment experiments', false)
    .parse(process.argv);

const options = program.opts();

const warmUp: boolean = options.warmUp;
const timeExperiment: boolean = options.timeExperiment;
const alignmentExperiment: boolean = options.alignmentExperiment;

const queries_directory = "./queries";
const result_directory = "./results";
const shape_directory = "./shapes/fully_bounded";


const query_map = await prepareQueries(queries_directory);
const shapes = await prepareShapes(shape_directory);

if (alignmentExperiment) {
    console.log("Containment analysis");
    await containmentAnalysis({ values: shapes, label: "basic_shapes" }, result_directory, query_map);
}else if (warmUp && timeExperiment) {
    console.log("Warm up");
    await timeEval({ values: shapes, label: "basic_shapes" }, result_directory, query_map, 100, true);
    console.log("Time analysis");
    await timeEval({ values: shapes, label: "basic_shapes" }, result_directory, query_map, 100, false, true);
}else if (timeExperiment) {
    console.log("Time analysis");
    await timeEval({ values: shapes, label: "basic_shapes" }, result_directory, query_map, 100);
}else if(warmUp){
    console.log("Did nothing time timeExperiment flag should be set")
}

