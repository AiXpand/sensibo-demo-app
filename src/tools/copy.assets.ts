import * as shell from 'shelljs';

// Copy all the view templates
shell.mkdir('dist/views');
shell.cp('-R', 'src/views', 'dist/views');
