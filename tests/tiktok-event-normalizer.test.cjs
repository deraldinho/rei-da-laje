const test=require('node:test');
const assert=require('node:assert/strict');
const {imageUrl,normalizeUser,normalizeGiftEvent}=require('../backend/tiktokEventNormalizer');

test('foto real do TikTok usa avatarLarge/Medium/Thumb urlList com fallback seguro',()=>{
 const data={user:{id:'123',uniqueId:'ana.live',nickname:'Ana',
   avatarThumb:{urlList:['http://inseguro/avatar.jpg','https://cdn.test/thumb.jpg']},
   avatarMedium:{urlList:['https://cdn.test/medium.jpg']},
   avatarLarge:{urlList:['https://cdn.test/large.jpg']}}};
 const user=normalizeUser(data);
 assert.equal(user.userId,'123');
 assert.equal(user.uniqueId,'ana.live');
 assert.equal(user.nickname,'Ana');
 assert.equal(user.profilePictureUrl,'https://cdn.test/large.jpg');
 assert.equal(imageUrl({urlList:['javascript:alert(1)','https://cdn.test/a.png']}),'https://cdn.test/a.png');
});

test('presente real usa GiftStruct.image.urlList, nome, id, diamantes e combo',()=>{
 const gift=normalizeGiftEvent({repeatCount:4,repeatEnd:1,common:{roomId:'900',msgId:'123456',createTime:'777'},user:{id:'55',uniqueId:'bia',nickname:'Bia',
   avatarThumb:{urlList:['https://cdn.test/bia.jpg']}},
   gift:{id:'6064',name:'Capivara',type:1,diamondCount:100,image:{urlList:['https://cdn.test/gift.png']}}});
 assert.deepEqual({id:gift.giftId,name:gift.giftName,type:gift.giftType,count:gift.repeatCount,end:gift.repeatEnd,diamonds:gift.diamondCount},
   {id:'6064',name:'Capivara',type:1,count:4,end:true,diamonds:100});
 assert.equal(gift.iconUrl,'https://cdn.test/gift.png');
 assert.equal(gift.profilePictureUrl,'https://cdn.test/bia.jpg');
 assert.equal(gift.roomId,'900');assert.equal(gift.messageId,'123456');assert.equal(gift.createTime,777);
});
