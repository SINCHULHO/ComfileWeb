const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../ComfileWeb/wwwroot/visualization-device-link.js'), 'utf8');
const start = source.indexOf('async function connectCfnetAndScanModules(');
const end = source.indexOf('window.connectCfnetAndScanModules =', start);
function setup(payload) {
    const requests = [], states = [], alerts = [];
    const context = {
        useKoreanLanguage: false,
        usbCdcConnectionState: { isConnected: true, testOk: true, portName: 'CFNET' },
        cfnetConnectionInProgress: false,
        isCfnetFieldIoSelected: () => true,
        getSelectedCfheaderAddress: () => 0,
        clearCfnetDetectedModules() {}, renderCfnetDetectedModules() {},
        updateUsbConnectionUi: state => states.push(state),
        alert: text => alerts.push(text), console: {warn() {}},
        loadUsbCdcPorts: async () => {},
        fetch: async (url) => { requests.push(url); return {ok:true,json:async () => payload}; }
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    return {context, requests, states, alerts};
}
test('rechecking a connected CFNET does not disconnect it', async () => {
    const s = setup({isConnected:true,modules:[]});
    assert.equal(await s.context.connectCfnetAndScanModules(), true);
    assert.deepEqual(s.requests, ['/api/cfnet/scan-modules']);
    assert.equal(s.states.at(-1).isConnected, true);
    assert.equal(s.alerts.length, 0);
});
test('a closed device is not reported as a successful runtime connection', async () => {
    const s = setup({isConnected:false,modules:[]});
    assert.equal(await s.context.connectCfnetAndScanModules(true), false);
    assert.equal(s.states.at(-1).isConnected, false);
    assert.match(s.alerts[0], /Cannot start runtime/);
});
