 # grunt-extract-sourcemap
 # https:#github.com/goodeggs/grunt-extract-sourcemap
 #
 # Copyright (c) 2013 Matt Blair
 # Licensed under the MIT license.
extract = require '../lib/extractor'
Lazy = require 'lazy.js/lazy'
path = require "path"

getSourceDirectory = (target, cwd) ->
  target.cwd or cwd

getFilepath = (target, cwd, file) ->
  sourceDirectory = getSourceDirectory target, cwd
  filepath = path.resolve sourceDirectory, file
  filepath

getRelativeDirectory = (target, cwd, filepath) ->
  relativeDirectory = ''
  sourceDirectory = getSourceDirectory target, cwd

  unless sourceDirectory is ''
    targetDirectory = path.dirname filepath
    relativeDirectory = path.relative sourceDirectory, targetDirectory

  relativeDirectory

module.exports = (grunt) ->
  grunt.registerMultiTask 'extract_sourcemap', 'Strips sourcemaps from a js file and links the original file to a newly created external source map', ->
    cwd = grunt.config('cwd') or ''
    options = @options()
    sources = []

    for target in @files
      if target.src?
        convertedArray = Lazy(target.src)
          .filter (file) ->
            filepath = getFilepath target, cwd, file
            exists = grunt.file.exists(filepath)
            # Warn on and remove invalid source files
            grunt.log.writeln "Does file #{filepath} exist? #{exists}" unless exists
            exists
          .map (file) ->
            filepath = getFilepath target, cwd, file
            relativeDirectory = getRelativeDirectory target, cwd, filepath
            # Read file source.
            source = grunt.file.read(filepath)
            {source, filepath, dest: target.dest, relativeDirectory, grunt, options}
          .toArray()

        sources = sources.concat(convertedArray)

    extract sourceConfig for sourceConfig in sources
