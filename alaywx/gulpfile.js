const gulp = require('gulp');
const ts = require('gulp-typescript');
const rename = require('gulp-rename');
const del = require('del');
const path = require('path');
const changed = require('gulp-changed');
const install = require('gulp-install');

// Project paths
const paths = {
  miniprogram: {
    src: 'src/miniprogram',
    dest: 'miniprogram',
    ts: ['src/miniprogram/**/*.ts', '!src/miniprogram/node_modules/**/*'],
    assets: ['src/miniprogram/**/*.{wxml,wxss,json,png,jpg,jpeg,gif,svg,wxs}', '!src/miniprogram/node_modules/**/*'],
    config: 'src/miniprogram/tsconfig.json'
  },
  cloudfunctions: {
    src: 'src/cloudfunctions',
    dest: 'cloudfunctions',
    ts: ['src/cloudfunctions/**/*.ts', '!src/cloudfunctions/**/node_modules/**/*'],
    assets: ['src/cloudfunctions/**/*.{json,png,jpg,jpeg,gif,svg}', '!src/cloudfunctions/**/node_modules/**/*'],
    config: 'src/cloudfunctions/tsconfig.json'
  }
};

// Clean task
function clean() {
  return del([
    paths.miniprogram.dest + '/**/*',
    '!' + paths.miniprogram.dest + '/miniprogram_npm/**/*', 
    '!' + paths.miniprogram.dest + '/node_modules/**/*',    
    paths.cloudfunctions.dest + '/**/*',
    '!' + paths.cloudfunctions.dest + '/node_modules/**/*'
  ]);
}

// Miniprogram Tasks
function buildMiniprogramTS() {
  const tsProject = ts.createProject(paths.miniprogram.config);
  return tsProject.src()
    .pipe(tsProject())
    .js
    .pipe(gulp.dest(paths.miniprogram.dest));
}

function copyMiniprogramAssets() {
  return gulp.src(paths.miniprogram.assets)
    .pipe(changed(paths.miniprogram.dest)) // Only copy changed files
    .pipe(gulp.dest(paths.miniprogram.dest))
    .pipe(install({production: true})); // Install dependencies if package.json changed
}

// Cloudfunctions Tasks
function buildCloudfunctionsTS() {
  const tsProject = ts.createProject(paths.cloudfunctions.config);
  return tsProject.src()
    .pipe(tsProject())
    .js
    .pipe(gulp.dest(paths.cloudfunctions.dest));
}

function copyCloudfunctionsAssets() {
  return gulp.src(paths.cloudfunctions.assets)
    .pipe(changed(paths.cloudfunctions.dest))
    .pipe(gulp.dest(paths.cloudfunctions.dest))
    .pipe(install({production: true}));
}

// Watch Task
function watch() {
  gulp.watch(paths.miniprogram.ts, buildMiniprogramTS);
  gulp.watch(paths.miniprogram.assets, copyMiniprogramAssets);
  gulp.watch(paths.cloudfunctions.ts, buildCloudfunctionsTS);
  gulp.watch(paths.cloudfunctions.assets, copyCloudfunctionsAssets);
}

// Define complex tasks
const buildMiniprogram = gulp.parallel(buildMiniprogramTS, copyMiniprogramAssets);
const buildCloudfunctions = gulp.parallel(buildCloudfunctionsTS, copyCloudfunctionsAssets);
const build = gulp.parallel(buildMiniprogram, buildCloudfunctions);

// Export tasks
exports.clean = clean;
exports.build = build;
exports.watch = gulp.series(build, watch);
exports.default = build;
