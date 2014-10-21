[![Build Status](https://travis-ci.org/duereg/grunt-extract-sourcemap.png)](https://travis-ci.org/duereg/grunt-extract-sourcemap)
[![Dependencies](https://david-dm.org/duereg/grunt-extract-sourcemap.png)](https://david-dm.org/duereg/grunt-extract-sourcemap)
[![devDependencies](https://david-dm.org/duereg/grunt-extract-sourcemap/dev-status.png)](https://david-dm.org/duereg/grunt-extract-sourcemap#info=devDependencies&view=table)
[![NPM version](https://badge.fury.io/js/grunt-extract-sourcemap.svg)](http://badge.fury.io/js/grunt-extract-sourcemap)

# grunt-extract-sourcemap

> Extracts sourcemaps from a js file and links the original file to an external source map file

> Formerly known as grunt-external-sourcemap

## Getting Started
This plugin requires [Grunt](http://gruntjs.com/)

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-extract-sourcemap --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-extract-sourcemap');
```

## The "extract-sourcemap" task

### Overview
In your project's Gruntfile, add a section named `extract-sourcemap` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  extract-sourcemap: {
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Usage Examples

#### Default Options
Given a set of files with inline source maps, the source maps are extracted into their own files and the original `.js` files are updated to point at the new external source map file.

```js
grunt.initConfig({
  extract-sourcemap: {
    files: {
      'public/build': ['src/build/output1.js', 'src/build/output2.js'],
    },
  },
})
```

#### Custom Options
You set a flag, `removeSourcesContent`, which will remove the sourcesContent field from the extracted source map.

```js
grunt.initConfig({
  extract-sourcemap: {
    options: { 'removeSourcesContent': true }
    files: {
      'public/build': ['src/build/output1.js', 'src/build/output2.js'],
    },
  },
})
```

## Installation

    $ npm install grunt-extract-sourcemap

## Tests

    $ npm test
