/// ENVVAR
// - CI:                output gas report to file instead of stdout
// - COVERAGE:          enable coverage report
// - ENABLE_GAS_REPORT: enable gas report
// - COMPILE_MODE:      production modes enables optimizations (default: development)
// - COMPILE_VERSION:   compiler version (default: 0.8.9)
// - COINMARKETCAP:     coinmarkercat api key for USD value in gas report
//
const gasOutputFile = process.argv.includes('hardhat') ? './gasreport/gas.eth.txt' : './gasreport/gas.fil.txt';

const fs = require('fs');
const path = require('path');
const argv = require('yargs/yargs')()
  .env('')
  .options({
    coverage: {
      type: 'boolean',
      default: false,
    },
    gas: {
      alias: 'enableGasReport',
      type: 'boolean',
      default: false,
    },
    gasReport: {
      alias: 'enableGasReportPath',
      type: 'string',
      implies: 'gas',
      default: undefined,
    },
    mode: {
      alias: 'compileMode',
      type: 'string',
      choices: ['production', 'development'],
      default: 'development',
    },
    ir: {
      alias: 'enableIR',
      type: 'boolean',
      default: false,
    },
    compiler: {
      alias: 'compileVersion',
      type: 'string',
      default: '0.8.13',
    },
    coinmarketcap: {
      alias: 'coinmarketcapApiKey',
      type: 'string',
    },
  }).argv;

require('@nomiclabs/hardhat-truffle5');
require('hardhat-ignore-warnings');
require('hardhat-exposed');
require('hardhat-gas-reporter');

require('solidity-docgen');

const filename = './node_modules/@openzeppelin/test-helpers/src/expectRevert.js'
const expectRevert = fs.readFileSync('./node_modules/@openzeppelin/test-helpers/src/expectRevert.js')
  .toString()
  .replace(`expect(actualError).to.equal(expectedError, 'Wrong kind of exception received');`, '');
fs.writeFileSync(filename, expectRevert);

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

const withOptimizations = argv.gas || argv.compileMode === 'production';

require('dotenv').config();

const { ethers } = require('ethers');

var nodeUrl;
try {
  const { initNode, sendFil } = require('../../kit');
  nodeUrl = initNode(1000);
} catch (e) {
  console.log(e);
  nodeUrl = '';
}

console.log("nodeUrl ", nodeUrl)
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: argv.compiler,
    settings: {
      optimizer: {
        enabled: withOptimizations,
        runs: 200,
      },
      viaIR: withOptimizations && argv.ir,
    },
  },
  warnings: {
    '*': {
      'code-size': withOptimizations,
      'unused-param': !argv.coverage, // coverage causes unused-param warnings
      default: 'error',
    },
  },
  defaultNetwork: "itest",
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
      allowUnlimitedContractSize: !withOptimizations,
    },
    itest: {
      url: nodeUrl,
      accounts: [process.env.USER_1_PRIVATE_KEY, process.env.USER_2_PRIVATE_KEY, process.env.USER_3_PRIVATE_KEY, process.env.USER_4_PRIVATE_KEY, process.env.USER_5_PRIVATE_KEY],
    },
  },
  exposed: {
    exclude: [
      'vendor/**/*',
      // overflow clash
      'utils/Timers.sol',
    ],
  },
  docgen: require('./docs/config'),
  gasReporter: {
    showMethodSig: true,
    currency: 'USD',
    outputFile: gasOutputFile,
    noColors: true,
    gasPrice: 1,
    blockLimit: 10000000000,
  },
};


if (argv.coverage) {
  require('solidity-coverage');
  module.exports.networks.hardhat.initialBaseFeePerGas = 0;
}
