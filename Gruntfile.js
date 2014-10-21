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
          "tools/*.js",
          "geom/*.js",
          "layout/*.js",
          "end.js"
        ],
        dest: "dist/<%= pkg.name %>.v.<%= pkg.version%>.js"
      },
      test: {

      }
    },
    jshint: {
      files: ["chart/*.js", "layout/*.js",
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
        src: ['chart/*.js'],
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
          '*/*.js', 
          "!charts.standalone.js",
          "!dist/*",
          ],
        tasks: ['concat', 'browserify'],
        options: {
          spawn: true,
          reload: false
        },  
      }
    }
  })
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-extract-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // default tasks
  grunt.registerTask('default', ["jshint", 'uglify', 'watch' ]);

  // don't think I need this;
  grunt.registerTask('hint', ["jshint"]);
}