# query-shape-alignment-table

A repository to calculate the alignment between a set of shapes and queries from [Solidbench](https://github.com/SolidBench/SolidBench.js/tree/master/templates/queries).

The results are presented in the `./results` folder. 
Each subdirectory contains the results of the algorithm with a set of shapes.
The shapes are defined in the `./shapes` folder.
The files with `{query}.json` present detailed algorithm results, and the `table.md` files present a summary.
There are also `time_eval_with_warm_up.json` files that present the time to run the algorithm (with an unwarm version too)
and a summuary of the results is presented in the file `time_eval_with_warm_up.json`.
The times were calculated with a sample size of 100.


## Usage

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run benchmark
```