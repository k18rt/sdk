import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GridSelection} from '../src/sudoku-app/grid-selection.js';
function fixture(initial=[]) {
 const selected=new Set(initial),visited=[],listeners=new Map(),captured=new Set();
 const cells=Array.from({length:9},(_,j)=>({dataset:{cell:`0${j}`},classList:{contains:name=>name==='given'&&j===2},closest(){return this;}}));
 const root={ownerDocument:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),elementFromPoint:(x,y)=>y>=0&&y<40?cells[Math.floor(x/40)]:null},contains:c=>cells.includes(c),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
 const gesture=new GridSelection((key,toggle)=>{visited.push(key);if(toggle&&selected.has(key))selected.delete(key);else selected.add(key);});
 const event=(x,type='mouse',extra={})=>({isPrimary:true,button:0,pointerType:type,pointerId:1,clientX:x,clientY:20,preventDefault(){},...extra});
 return {gesture,root,event,selected,visited,listeners,captured};
}
test('a single held mouse press sweeps across editable cells, skipping black givens',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20),f.root,'00');f.gesture.move(f.event(180));
 assert.deepEqual([...f.selected],['00','01','03','04']);
 f.gesture.move(f.event(20));assert.equal(f.visited.length,4);
});
test('touch sweep still works with the same editable-cell rule',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20,'touch'),f.root,'00');f.gesture.move(f.event(180,'touch'));
 assert.deepEqual([...f.selected],['00','01','03','04']);assert.equal(f.captured.size,1);
});
test('trackpad-generated mouse press does not require a click count or a timer',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20,'mouse',{detail:0}),f.root,'00');
 f.gesture.move(f.event(180,'mouse',{detail:0}));assert.equal(f.selected.size,4);
});
test('Shift sweep adds unselected cells and removes selected cells, once each',()=>{
 // After the initial Shift-click, 00 has already been added. 01/04 were selected.
 const f=fixture(['00','01','04','08']);
 f.gesture.start(f.event(20,'mouse',{shiftKey:true}),f.root,'00');
 f.gesture.move(f.event(180,'mouse',{shiftKey:true}));
 assert.deepEqual([...f.selected],['00','08','03']);
 f.gesture.move(f.event(20,'mouse',{shiftKey:true}));
 assert.deepEqual([...f.selected],['00','08','03']);
 assert.equal(f.visited.length,3);
});
test('Shift sweep never toggles the first cell twice when the initial click removed it',()=>{
 const f=fixture(['08']); // initial Shift-click has already removed 00
 f.gesture.start(f.event(20,'mouse',{shiftKey:true}),f.root,'00');f.gesture.move(f.event(60));
 assert.deepEqual([...f.selected],['08','01']);
});
test('a stationary mouse click preserves annotation double-click handling',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20),f.root,'00');assert.equal(f.captured.size,0);
 f.gesture.end(f.event(20,'mouse',{type:'pointerup'}));
 assert.equal(f.gesture.suppressDoubleClick,false);assert.equal(f.visited.length,0);assert.equal(f.listeners.size,0);
});
test('release stops selection and removes document listeners and pointer capture',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20),f.root,'00');f.gesture.move(f.event(60));
 f.gesture.end(f.event(60,'mouse',{type:'pointerup'}));f.gesture.move(f.event(180));
 assert.deepEqual([...f.selected],['00','01']);assert.equal(f.listeners.size,0);assert.equal(f.captured.size,0);
});
test('cancel stops touch selection and ignores a second finger',()=>{
 const f=fixture(['00']);f.gesture.start(f.event(20,'touch'),f.root,'00');f.gesture.move(f.event(180,'touch',{pointerId:2}));
 f.gesture.end(f.event(20,'touch',{type:'pointercancel'}));f.gesture.move(f.event(180,'touch'));
 assert.deepEqual([...f.selected],['00']);assert.equal(f.captured.size,0);assert.equal(f.listeners.size,0);
});
