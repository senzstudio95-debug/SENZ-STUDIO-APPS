const assert=require('node:assert/strict');const P=require('../parser.js');const mapping=[{code:'A1',family:'Arial'},{code:'A2',family:'Georgia'}];
const t='Order ID: 123456789\nSticker Nama Custom\nBuyer note: Aiman Hakimi\nVariasi: A1 / 22 x 5 cm / Putih\nQty: 2\nOrder ID: 987654321\nProduk Lain\nBuyer note: Salah\nOrder ID: 112233445\nSticker Nama Custom\nBuyer note: Nama: Nur Elyana; Font: A2; Size: 18 cm; Color: Rainbow';
const r=P.parse({text:t},'Sticker Nama Custom',mapping);assert.equal(r.length,2);assert.equal(r[0].custom_name,'Aiman Hakimi');assert.equal(r[0].font,'A1');assert.equal(r[0].quantity,2);assert.equal(r[1].custom_name,'Nur Elyana');assert.equal(r[1].color,'Rainbow');assert.equal(P.colorHex('Putih'),'#969da7');assert.equal(P.parse({blocks:[t.split('Order ID: 987')[0],t.split('Order ID: 987')[0]]},'Sticker Nama Custom',mapping).length,1);assert.throws(()=>P.parse({text:t},'',mapping));console.log('Parser tests passed: product filtering, multiple orders, inline notes, quantity, dedupe, empty filter, color mapping');
assert.equal(P.matchesProduct('STICKER NAMA CUSTOM — RAINBOW / LASER','Stiker nama rainbow laser'),true);
assert.equal(P.matchesProduct('Sticker Nama Rainbow','rain'),false);
assert.equal(P.parse({blocks:['Order ID: 12345678\nSticker nama rainbow laser\nBuyer note: Senz\nOrder ID: 23456789\nSticker nama rainbow laser\nBuyer note: Sen']},'Stiker rainbow laser',mapping).length,2);
console.log('2.0.1 matching tests passed');
for(const q of ['× 1','x1','X3','× 12']){
 const example='Stiker nama rainbow laser\n'+q+'\nA8, 5INCH X 2INCH (MOTO KERETA)\nAffiliate creator';
 const item=P.parse({blocks:[example]},'Stiker nama rainbow laser',mapping)[0];
 assert.equal(item.font,'A8');assert.equal(item.size,'5INCH X 2INCH');assert.equal(item.quantity,Number(q.replace(/\D/g,'')));assert.equal(item.custom_name,'');
}
for(const size of ['5INCH X 2INCH','5 INCH × 2 INCH','5 x 2 inch','12.5cm x 5cm','22 x 5 cm','50 mm × 20 mm']){
 const item=P.parseBlock('Sticker Nama Custom\nA8, '+size+'\nx4','Sticker Nama Custom',mapping);assert.equal(item.size,size);assert.equal(item.quantity,4);
}
assert.equal(P.parseBlock('Sticker Nama Custom\nA8, 5INCH X 2INCH','Sticker Nama Custom',mapping).quantity,1);
console.log('2.0.2 tests passed: A8 unmapped, inches, mixed dimensions, x/× quantities, dimension not mistaken for quantity');
for(const msg of ['Customer message: bunian Wulan','Customer message:\nbunian Wulan','Customer message: Nama: bunian Wulan; Font: A8']){
 const r=P.parseBlock('Stiker nama rainbow laser\nA8, 5INCH X 2INCH\n×1\n'+msg,'Stiker nama rainbow laser',mapping);assert.equal(r.custom_name,'bunian Wulan');
}
console.log('2.0.3 Customer message tests passed');
const productRow='Stiker nama rainbow laser\n×1\nA3, 8INCH X 2INCH (MOTO KERETA)\nSeller-signed creator';
const completePage='Orders\nOrder ID: 58715844852382409\nPre-order\n'+productRow+'\nCustomer message: bunian Wulan\nOrder ID: 58715844852382410\n'+productRow+'\nCustomer message: Siti Aminah\nOrder ID: 58715844852382411\nProduk Lain\nCustomer message: JANGAN AMBIL';
const complete=P.parse({blocks:[productRow],text:completePage},'Stiker nama rainbow laser',mapping);
assert.equal(complete.length,2);assert.equal(complete[0].order_id,'58715844852382409');assert.equal(complete[0].custom_name,'bunian Wulan');assert.equal(complete[0].font,'A3');assert.equal(complete[0].size,'8INCH X 2INCH');assert.equal(complete[0].quantity,1);assert.equal(complete[1].custom_name,'Siti Aminah');
const absent=P.parse({blocks:[productRow],text:'Order ID: 58715844852382409\n'+productRow+'\nOrder ID: 58715844852382410\nProduk Lain\nCustomer message: JANGAN AMBIL'},'Stiker nama rainbow laser',mapping);assert.equal(absent[0].custom_name,'');
console.log('2.0.4 tests passed: full order footer beats incomplete product row; separate Customer messages stay within their order IDs');
