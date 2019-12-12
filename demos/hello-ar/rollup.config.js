import copy from 'rollup-plugin-copy-glob';
import createDefaultConfig from '@open-wc/building-rollup/modern-config';

// if you need to support IE11 use "modern-and-legacy-config" instead.
// import createDefaultConfig from '@open-wc/building-rollup/modern-and-legacy-config';

let config = createDefaultConfig({
  input: './index.html',
  extensions: ['.js', '.mjs']
});

function workbox(config) {
	return {
		name: 'workbox',
		async writeBundle() {
      let build = require('workbox-build');
      const { count, size } = await build.generateSW(config);
      console.log(count, size);
    }
	};
}

export default {
  ...config,
  plugins: [
    copy([
      { files: 'manifest.json', dest: 'dist' },
      { files: '*.css', dest: 'dist' },
      { files: 'images/*.png', dest: 'dist/images/' },
      { files: 'textures/**/*.*', dest: 'dist/textures/' },
      { files: 'models/**/*.*', dest: 'dist/models/' },
      { files: 'images/manifest/*.{png,svg}', dest: 'dist/images/manifest' }
    ], { verbose: false, watch: false }),
    ...config.plugins,
    workbox({
      globDirectory: "dist",
      globPatterns: [
        '**/*.{js,css,html,png,svg,json}'
      ],
      globIgnores: ['**/manifest.json'],
      swDest: "dist/sw.js",
    }),
  ],
};