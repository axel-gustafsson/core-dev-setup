#! /usr/bin/env node

const childProcess = require('child_process');
const path = require('path');
const yargs = require('yargs');
const mkdirp = require('mkdirp');

const util = require('./utils/util')

util.getLatestEngineVersion().then((engineTag) => {
    
    const isWin = /^win/.test(process.platform);
    
    const args = yargs
      .usage('Usage: $0 [options]')
      .epilogue(
        'This command starts Qlik Core in a local dev environment.'
      )
      .option('p', {
        alias: 'port',
        default: '9076',
        describe: 'Port to expose on the host',
      })
      .option('a', {
        alias: 'apps-path',
        default: isWin ? '~/Documents/Qlik/Sense/Apps' : '~/Qlik/Sense/Apps',
        describe: 'Apps path for engine.',
      })
      .option('e', {
        alias: 'extensions-path',
        default: isWin
          ? '~/Documents/Qlik/Sense/Extensions'
          : '~/Qlik/Sense/Extensions',
        describe: 'Extensions path for engine.',
      })
      .option('m', {
        alias: 'content-path',
        default: isWin ? '~/Documents/Qlik/Sense/Content' : '~/Qlik/Sense/Content',
        describe: 'Media path for engine.',
      })
      .option('detach', {
        default: true,
        describe: 'Run containers in the background',
      })
      .option('t', {
        alias: 'stop',
        default: false,
        describe: 'Stop the containers.',
      }).argv;
    
    const {
      port,
      appsPath,
      extensionsPath,
      contentPath,
      detach,
      stop,
    } = args;
    
    let hasCleanedUp = false;
    
    const composeProject = 'core-dev';
    const composeFiles = ['./docker-compose.yml'];
    
    function exec(cmd, stdio = 'inherit') {
      try {
        childProcess.execSync(cmd, {
          stdio,
        });
      } catch (err) {
        console.log(err.message);
        console.log('');
        throw err;
      }
    }
    
    function cleanup() {
      if (hasCleanedUp) {
        return;
      }
      hasCleanedUp = true;
      console.log('Stopping containers');
      exec(
        `docker-compose ${composeFiles
          .map(f => `-f ${f}`)
          .join(' ')} -p ${composeProject} down --remove-orphans`
      );
    }
    
    process.on('exit', cleanup);
    process.on('SIGINT', process.exit);
    process.on('SIGTERM', process.exit);
    process.on('uncaughtException', (err) => {
      if (!hasCleanedUp) {
        console.log(err.stack);
        process.exit(1);
      }
    });
    
    process.chdir(path.resolve(__dirname, '../'));
    process.stdin.resume();
    
    // Set environment variables for compose file
    process.env.PORT = port;
    process.env.ENGINE_VERSION = engineTag
    process.env.ENGINE_PARAMS = ''
    
    process.env.APPS_PATH = appsPath;
    process.env.EXTENSIONS_PATH = extensionsPath;
    process.env.MEDIA_PATH = contentPath;
    
    async function start() {
      console.log('Starting containers');
        
      try {
        console.log(`Mounting apps from '${process.env.APPS_PATH}'`);
        console.log(`Mounting extensions from '${process.env.EXTENSIONS_PATH}'`);
        console.log(`Mounting media from '${process.env.MEDIA_PATH}'`);
        console.log(
          `Starting environment with engine version ${
            process.env.ENGINE_VERSION
          }`
        );
    
        exec(
          `docker-compose ${composeFiles
            .map(f => `-f ${f}`)
            .join(' ')} -p ${composeProject} up ${detach ? '-d' : ''} --build`,
          [process.stdin, process.stdout, process.stderr]
        );
    
        console.log('Docker environment is up and running');
      } catch (err) {
        // Error during startup - stop containers to not leave them half-initialized
        cleanup();
        throw err;
      }
      console.log('');
    }
    
    if (stop) {
      cleanup();
      process.exit(0);
    } else {
      start();
    }


})