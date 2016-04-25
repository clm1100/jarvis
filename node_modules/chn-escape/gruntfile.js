/**
 * Created by Mamba on 6/6/15.
 */
module.exports = function(grunt) {
  //配置参数
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['gruntfile.js', 'escape.js'],
      options: {
        globals: {
          exports: true
        }
      }
    },
    uglify: {
      options: {},
      dist: {
        files: { 'escape.min.js': 'escape.js' }
      }
    }
  });

  //载入 jshint 插件，用于 JS 压缩
  grunt.loadNpmTasks('grunt-contrib-jshint');

  //载入 uglify 插件，用于 JS 压缩
  grunt.loadNpmTasks('grunt-contrib-uglify');

  //注册任务
  grunt.registerTask('default', ['jshint', 'uglify']);
};