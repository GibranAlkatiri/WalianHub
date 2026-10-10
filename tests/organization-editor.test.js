import {test,expect} from 'bun:test';
import {changePosition,removePosition,parentChoices,organizationLayout} from '../public/admin/organization-editor.js';
const sample=()=>[
  {jabatan:'Sekretaris',nama:['Nama sekretaris'],atasan:'Lurah',garisSamping:false},
  {jabatan:'Kasi',nama:[],atasan:'Lurah',garisSamping:false},
  {jabatan:'Staf',nama:['Nama staf'],atasan:'Kasi',garisSamping:false},
];
const draft=(item,changes={})=>({...item,nama:item.nama.join('\n'),...changes});
test('mengganti nama jabatan memperbarui atasan bawahan tanpa mengubah pejabat',()=>{
  const list=sample();changePosition(list,list[1],draft(list[1],{jabatan:'Kasi Pelayanan'}));
  expect(list[2].atasan).toBe('Kasi Pelayanan');expect(list[2].nama).toEqual(['Nama staf']);
});
test('memindahkan jabatan juga memindahkan seluruh cabangnya',()=>{
  const list=sample();changePosition(list,list[1],draft(list[1],{atasan:'Sekretaris'}));
  expect(list[1].atasan).toBe('Sekretaris');expect(list[2].atasan).toBe('Kasi');
  const layout=organizationLayout(list);expect(layout.nodes.find(node=>node.item===list[2]).y).toBeGreaterThan(layout.nodes.find(node=>node.item===list[1]).y);
});
test('nama kosong, nama ganda, Lurah dan siklus ditolak tanpa mengubah data',()=>{
  const list=sample(),before=structuredClone(list);
  for(const change of [{jabatan:''},{jabatan:'Lurah'},{jabatan:'Sekretaris'},{atasan:'Kasi'},{atasan:'Staf'},{atasan:'Tidak ada'}])expect(()=>changePosition(list,list[1],draft(list[1],change))).toThrow();
  expect(list).toEqual(before);expect(parentChoices(list,list[1])).toEqual(['Lurah','Sekretaris']);
});
test('jabatan koordinasi bukan calon atasan dan jabatan yang punya bawahan tetap memakai hubungan langsung',()=>{
  const list=sample();list[0].garisSamping=true;
  expect(parentChoices(list,list[1])).toEqual(['Lurah']);
  expect(()=>changePosition(list,list[1],draft(list[1],{garisSamping:true}))).toThrow();
  expect(()=>changePosition(list,null,{jabatan:'Baru',nama:'',atasan:'Sekretaris',garisSamping:false})).toThrow();
});
test('hapus jabatan mempertahankan bawahan dan nama pejabat dengan memindahkannya ke atasan sebelumnya',()=>{
  const list=sample();changePosition(list,list[1],draft(list[1],{atasan:'Sekretaris'}));removePosition(list,list[1]);
  expect(list.map(item=>item.jabatan)).toEqual(['Sekretaris','Staf']);expect(list[1].atasan).toBe('Sekretaris');expect(list[1].nama).toEqual(['Nama staf']);
});
test('jabatan baru menyimpan kontrak array nama, atasan dan boolean koordinasi',()=>{
  const list=sample();const item=changePosition(list,null,{jabatan:'  Bendahara  ',nama:' Nama A\n\n Nama B ',atasan:'Lurah',garisSamping:true});
  expect(item).toEqual({jabatan:'Bendahara',nama:['Nama A','Nama B'],atasan:'Lurah',garisSamping:true});
});
test('perubahan atasan mengubah bentuk bagan dan semua kotak tetap berada dalam kanvas tanpa bertumpuk',()=>{
  const list=sample(),before=organizationLayout(list);changePosition(list,list[1],draft(list[1],{atasan:'Sekretaris'}));const after=organizationLayout(list);
  expect(after.nodes.find(node=>node.item===list[1]).y).toBeGreaterThan(before.nodes.find(node=>node.item===list[1]).y);
  for(const node of after.nodes){expect(node.x).toBeGreaterThanOrEqual(0);expect(node.x+176).toBeLessThanOrEqual(after.width);expect(node.y+104).toBeLessThanOrEqual(after.height);}
  for(let i=0;i<after.nodes.length;i++)for(let j=i+1;j<after.nodes.length;j++){
    const a=after.nodes[i],b=after.nodes[j];expect(a.x+176<=b.x||b.x+176<=a.x||a.y+104<=b.y||b.y+104<=a.y).toBe(true);
  }
});
test('koordinasi memakai garis putus-putus dan tidak menumpuk dengan kotak lain',()=>{
  const list=sample();list[0].garisSamping=true;const result=organizationLayout(list);
  expect(result.edges.some(edge=>edge.side)).toBe(true);expect(result.nodes.find(node=>node.item===list[0]).side).toBe(true);
});
test('draf dengan siklus atau atasan hilang tersedia untuk diperbaiki; pembacaan bagan tidak mengubah data',()=>{
  const list=sample();list[0].atasan='Staf';list[1].atasan='Sekretaris';const before=structuredClone(list),result=organizationLayout(list);
  expect(result.unplaced).toHaveLength(3);expect(result.nodes).toHaveLength(1);expect(list).toEqual(before);
});
test('bagan kosong tetap menampilkan Lurah dan anak invalid pada jabatan koordinasi tidak hilang',()=>{
  expect(organizationLayout([]).nodes).toEqual([{item:null,x:16,y:16,side:false}]);
  const list=sample();list[1].garisSamping=true;const result=organizationLayout(list);
  expect(result.unplaced).toContain(list[2]);expect(new Set([...result.nodes.map(node=>node.item),...result.unplaced]).size).toBe(list.length+1);
});
