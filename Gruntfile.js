'use strict';
 var
    shims = require("./shim"),
    sharedModules = Object.keys(shims).concat([
    ]);

module.exports = function(grunt){
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    concat: {
      dist: {
        src: [
          "begin.js",
          "src/tools/*.js",
          "src/base/*.js",
          "src/geoms/histogram.js",
          "src/geoms/*.js",
          "src/stats/*.js",
          "end.js"
        ],
        dest: "dist/<%= pkg.name %>.v.<%= pkg.version%>.js"
      },
      test: {
        "plot": "test/plot.js"
      }
    },
    jshint: {
      files: ["src/**/*.js",
      "!node_modules/**/*"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
        build: {
        src: [
          "begin.js",
          "src/tools/*.js",
          "src/base/*.js",
          "src/geoms/*.js",
          "src/stats/*.js",
          "end.js"
        ],
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    browserify: {
      all: {
        files: {
          "./<%= pkg.name%>.standalone.js": ["./browserified.js"]
        },
        options: {
          browserifyOptions: {
            transform: ['browserify-shim']
          },
          watch: false,
          keepAlive:false,
          debug: true
        }
      }

    },
    watch: {
      scripts: {
        files: [
          '*.js', "src/*/*.js", "src/*.js",
          "!dist/*",
          ],
        tasks: ['concat', 'browserify', 'jshint'],
        options: {
          spawn: true,
          reload: false
        },  
      }
    },
    vows: {
      all: {
        options: {reporter: 'spec'},
        src: ["test/*.js", "!test/test-setup.js"],
      }
    }
  })
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-extract-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-vows');

  // default tasks
  grunt.registerTask('default', ["jshint", 'concat', 'watch']);

  // don't think I need this;
  grunt.registerTask('hint', ["jshint"]);
}