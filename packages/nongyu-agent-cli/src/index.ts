import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('nongyu')
  .description('Nongyu Agent CLI')
  .version('1.0.0');

program
  .command('hello')
  .description('Say hello')
  .action(() => {
    console.log(chalk.green('Hello from Nongyu Agent CLI!'));
  });

program.parse();
