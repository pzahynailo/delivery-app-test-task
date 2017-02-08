module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-bg-shell');
  // подключаем grunt-reload
  grunt.loadNpmTasks('grunt-reload');

  // Project configuration.
  grunt.initConfig({
    bgShell: {
      //Запускаем приложение с помощью supervisor'a
      //Теперь при изменении серверного кода 
      //сервер перезапускается автоматически
      supervisor: {
            cmd: 'supervisor app.js',
            stdout: true,
            stderr: true,
            bg: true
      }
    },
    //настраиваем reload
    //сервер приложения крутится на localhost:3000
    //переходим на localhost:6001 и получаем то же приложение только с LiveReload
    reload: {
      port: 6001,
      proxy: {
        host: 'localhost',
        port: 3000
      },
    },
    watch: {
      //при изменении любого из этих файлов запустить задачу 'reload'
      files: [
        //add here static file which need to be livereloaded
        'public/styles/**/*.css',
        'public/scripts/**/*.js',
        'public/images/**/*',
        ],
      tasks: 'reload'
    }
  });

  //стартуем приложение
  //reload и на клиенте и на сервере
  grunt.registerTask('server', 'bgShell:supervisor reload watch');
};  