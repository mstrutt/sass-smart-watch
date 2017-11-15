const gulp = require('gulp');
const sass = require('gulp-sass');
const sassGraph = require('sass-graph');
const _ = require('lodash');

const graph = sassGraph.parseDir('./testfiles');

var dependencyTree = buildDependencyTree();

gulp.task('watch', (...args) => {
	gulp.watch('./testfiles/*.scss', ({ type, path }) => {
		const fileGraph = sassGraph.parseFile(path);
		const imports = fileGraph.index[path].imports;

		const cachedTree = graph.index[path];

		// If it's a new file, add its entry to the graph
		if (!cachedTree) {
			graph.index[path] = fileGraph.index[path];
		}

		// If an import has been changed, rebuild the tree
		if (!cachedTree || !_.isEqual(cachedTree.imports, imports)) {
			graph.index[path].imports = imports;
			dependencyTree = buildDependencyTree();
		}
		
		const toRebuild = Object.keys(dependencyTree)
			.filter(file => dependencyTree[file].includes(path));

		return sassTask(toRebuild);
	});
});

function sassTask (files) {
	return gulp.src(files)
		.pipe(sass())
		.pipe(gulp.dest('dist'));
}

function isTopLevel (filePath) {
	const fileName = filePath.split('/').pop();
	return fileName[0] !== '_';
}

function buildDependencyTree () {
	var dependencies = {};

	function mapImportDependencies (file, topLevelFile) {
		const leafData = graph.index[file];
		dependencies[topLevelFile] = _.union(leafData.imports, dependencies[topLevelFile] || []);
		leafData.imports.forEach((importFile) => {
			mapImportDependencies(importFile, topLevelFile)
		});
	}

	Object.keys(graph.index)
		.filter(isTopLevel)
		.forEach((file) => {
			mapImportDependencies(file, file);
		});

	return dependencies;
}
