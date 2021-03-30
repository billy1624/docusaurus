/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import StaticSiteGeneratorPlugin from '@endiliey/static-site-generator-webpack-plugin';
import {Configuration} from 'webpack';
import merge from 'webpack-merge';

import {Props} from '@docusaurus/types';
import {createBaseConfig} from './base';
import WaitPlugin from './plugins/WaitPlugin';
import LogPlugin from './plugins/LogPlugin';
import {NODE_MAJOR_VERSION, NODE_MINOR_VERSION} from '../constants';

export default function createServerConfig({
  props,
  onLinksCollected = () => {},
}: {
  props: Props;
  onLinksCollected?: (staticPagePath: string, links: string[]) => void;
}): Configuration {
  const {
    baseUrl,
    routesPaths,
    generatedFilesDir,
    headTags,
    preBodyTags,
    postBodyTags,
    ssrTemplate,
    siteConfig: {noIndex},
  } = props;
  const config = createBaseConfig(props, true);

  const routesLocation = {};
  // Array of paths to be rendered. Relative to output directory
  const ssgPaths = routesPaths.map((str) => {
    const ssgPath =
      baseUrl === '/' ? str : str.replace(new RegExp(`^${baseUrl}`), '/');
    routesLocation[ssgPath] = str;
    return ssgPath;
  });
  const serverConfig = merge(config, {
    target: `node${NODE_MAJOR_VERSION}.${NODE_MINOR_VERSION}`,
    entry: {
      main: path.resolve(__dirname, '../client/serverEntry.js'),
    },
    output: {
      filename: 'server.bundle.js',
      libraryTarget: 'commonjs2',
      // Workaround for Webpack 4 Bug (https://github.com/webpack/webpack/issues/6522)
      globalObject: 'this',
    },
    plugins: [
      // Wait until manifest from client bundle is generated
      new WaitPlugin({
        filepath: path.join(generatedFilesDir, 'client-manifest.json'),
      }),

      // Static site generator webpack plugin.
      new StaticSiteGeneratorPlugin({
        entry: 'main',
        locals: {
          baseUrl,
          generatedFilesDir,
          routesLocation,
          headTags,
          preBodyTags,
          postBodyTags,
          onLinksCollected,
          ssrTemplate,
          noIndex,
        },
        paths: ssgPaths,
      }),

      // Show compilation progress bar.
      new LogPlugin({
        name: 'Server',
        color: 'yellow',
      }),
    ],
  });
  return serverConfig;
}
