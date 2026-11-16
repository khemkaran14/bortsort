// pm2 process file: pm2 start apps/server/deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'boltsort-server',
      cwd: __dirname + '/..',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      node_args: '--env-file=.env',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
