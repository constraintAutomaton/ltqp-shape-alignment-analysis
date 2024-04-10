# query-shape-alignment-table

A repository to calculate the alignment between a set of shapes and queries from [Solidbench](https://github.com/SolidBench/SolidBench.js/tree/master/templates/queries).

The results are presented into the `./results` folder. 
Each subdirectory contains the results of an approach to the algorithm.
The `.json` file present detail results of the algorithm and the 
`table.md` present a markdown summary of the alignment of all the queries.

## Usage

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.14. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
