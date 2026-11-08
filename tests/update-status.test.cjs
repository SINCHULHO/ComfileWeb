const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../ComfileWeb/wwwroot/comfileweb-update.js'), 'utf8');
function setup() {
    const elements = [];
    const events = {};
    const state = { dirty: false, projectName: 'Saved' };
    const designer = { inert: false };
    const window = { comfileWebUseKoreanLanguage: false, comfileMcpProject: { status: () => state, saveForUpdate: async () => true }, addEventListener: (n,f) => events[n]=f };
    const context = { window, runtimeRunning:false, runtimeStarting:false, location:{hostname:'localhost'},
        document:{readyState:'loading',body:{append(){}},querySelector:()=>designer,addEventListener:(n,f)=>events[n]=f,
            createElement:()=> { const e = {append(){},setAttribute(){},addEventListener(n,f){this[n]=f;}}; elements.push(e);return e; }},
        sessionStorage:{setItem(){},removeItem(){},getItem(){return null;}},setInterval:()=>1,clearInterval(){},Date,
        fetch: async (url, options) => options?.method === 'POST'
            ? {ok:false,json:async()=>({code:'DIRTY_EDITOR',projectName:'Other tab'})}
            : {ok:true,json:async()=>({currentVersion:'0.9.1936',availableVersion:'0.9.1937',token:'test'})}
    };
    vm.runInNewContext(source, context);
    return {context, window, state, designer, events, banner:elements[0],label:elements[1],button:elements[2],discardButton:elements[3]};
}

test('download notice supports language, later dismissal, and local update priority', async () => {
    const s=setup();
    let local = false;
    s.context.fetch=async url=>({ok:true,json:async()=>url.includes('download-update')
        ? {currentVersion:'0.9.1940',latestVersion:'0.10.1'}
        : {currentVersion:'0.9.1940',availableVersion:local?'0.10.2':null}});
    await s.events.DOMContentLoaded();
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(s.label.textContent,/Latest: 0.10.1/);
    assert.equal(s.button.textContent,'Go to download');
    s.window.comfileWebUseKoreanLanguage=true;
    s.events['visualization-language-changed']();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(s.button.textContent,'다운로드 하러 가기');
    let opened;
    s.window.open=(...args)=>opened=args;
    await s.button.click();
    assert.match(opened[0],/lang=ko&product=comfileweb$/);
    await s.events.focus();
    assert.equal(s.banner.hidden,true);
    local=true;
    await s.events.focus();
    assert.equal(s.banner.hidden,false);
    assert.equal(s.button.textContent,'저장 후 업데이트');
});

test('Later hides the download notice across polling without opening a page', async () => {
    const s=setup();
    s.context.fetch=async url=>({ok:true,json:async()=>url.includes('download-update')
        ? {currentVersion:'0.9.1940',latestVersion:'0.10.1'} : {currentVersion:'0.9.1940'}});
    await s.events.DOMContentLoaded();
    await new Promise(resolve=>setImmediate(resolve));
    await s.discardButton.click();
    await s.events.focus();
    assert.equal(s.banner.hidden,true);
    assert.equal(s.designer.inert,false);
});
test('dirty tab reports identity and remains editable; runtime and storage have separate reasons', () => {
    const s=setup(); s.state.dirty=true;
    assert.equal(s.window.comfileUpdateUi.lock('old').code,'DIRTY_EDITOR');
    assert.equal(s.window.comfileUpdateUi.lock('old').projectName,'Saved');
    assert.equal(s.designer.inert,false);
    assert.match(s.label.textContent,/This tab has unsaved changes/);
    s.context.runtimeRunning=true;
    assert.equal(s.window.comfileUpdateUi.lock('old').code,'RUNTIME_ACTIVE');
    s.context.runtimeRunning=false; s.state.dirty=false;
    s.context.sessionStorage.setItem=()=>{throw new Error();};
    assert.equal(s.window.comfileUpdateUi.lock('old').code,'STORAGE_UNAVAILABLE');
});
test('discard confirmation cancel makes no request; accept skips saving and sends explicit mode', async () => {
    const s=setup(); await s.events.DOMContentLoaded();
    let requests=0, saves=0, headers;
    s.window.comfileMcpProject.saveForUpdate=async()=>{saves++;return true;};
    s.context.fetch=async(url,options)=>{requests++;headers=options.headers;return {ok:false,json:async()=>({code:'NO_EDITORS'})};};
    s.window.confirm=()=>false;
    await s.discardButton.click();
    assert.equal(requests,0); assert.equal(saves,0);
    s.state.dirty=true; s.window.confirm=()=>true;
    await s.discardButton.click();
    assert.equal(requests,1); assert.equal(saves,0);
    assert.equal(headers['X-Comfile-Discard-Unsaved'],'true');
    assert.equal(s.state.dirty,true, 'Failed updates must preserve unsaved changes');
    assert.equal(s.discardButton.disabled,false);
});
test('discard mode locks dirty tabs but still refuses active runtime and unlock preserves edits', () => {
    const s=setup(); s.state.dirty=true;
    assert.equal(s.window.comfileUpdateUi.lock('old',true).success,true);
    assert.equal(s.designer.inert,true);
    assert.equal(s.state.dirty,true);
    s.window.comfileUpdateUi.unlock();
    assert.equal(s.state.dirty,true);
    assert.equal(s.designer.inert,false);
    s.context.runtimeRunning=true;
    assert.equal(s.window.comfileUpdateUi.lock('old',true).code,'RUNTIME_ACTIVE');
});
test('requesting tab shows the blocking project and polling preserves the explanation', async () => {
    const s=setup(); await s.events.DOMContentLoaded(); await s.button.click();
    assert.match(s.label.textContent,/Other tab/);
    assert.match(s.label.textContent,/unsaved changes/);
    await s.events.focus();
    assert.match(s.label.textContent,/Other tab/);
    assert.equal(s.designer.inert,false);
    assert.equal(s.button.disabled,false);
});
