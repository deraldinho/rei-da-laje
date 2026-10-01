function firstHttps(...values) {
  for (const value of values.flat(Infinity)) {
    const text=String(value||'').trim();
    if (/^https:\/\/[^\s]+$/i.test(text)) return text.slice(0,1000);
  }
  return '';
}
function imageUrl(image) {
  if (!image) return '';
  return firstHttps(image.urlList, image.url_list, image.url, image.uri);
}
function normalizeUser(data={}) {
  const user=data.user || data;
  return {
    userId:String(user.userId ?? user.id ?? data.userId ?? '').trim(),
    uniqueId:String(user.uniqueId ?? user.displayId ?? data.uniqueId ?? '').trim().slice(0,60),
    nickname:String(user.nickname ?? data.nickname ?? user.uniqueId ?? 'Espectador').slice(0,60),
    profilePictureUrl:firstHttps(
      user.profilePictureUrl,
      imageUrl(user.avatarLarge),
      imageUrl(user.avatarMedium),
      imageUrl(user.avatarThumb),
      data.profilePictureUrl
    )
  };
}
function normalizeGiftEvent(data={}) {
  const user=normalizeUser(data);
  const gift=data.gift || {};
  const common=data.common || {};
  return {
    ...user,
    roomId:String(data.roomId ?? common.roomId ?? '').slice(0,40),
    messageId:String(data.messageId ?? data.msgId ?? common.msgId ?? '').slice(0,64),
    createTime:Number(data.createTime ?? common.createTime ?? 0) || 0,
    giftId:data.giftId ?? gift.id ?? '',
    giftName:String(data.giftName ?? gift.name ?? gift.describe ?? '').slice(0,90),
    diamondCount:Number(data.diamondCount ?? gift.diamondCount ?? 0) || 0,
    repeatCount:Math.max(1,Math.floor(Number(data.repeatCount)||1)),
    repeatEnd:Boolean(data.repeatEnd),
    giftType:Number(data.giftType ?? gift.type ?? 0) || 0,
    iconUrl:firstHttps(data.iconUrl,imageUrl(gift.image),gift.iconUrl,gift.imageUrl,gift.icon?.url)
  };
}
module.exports={firstHttps,imageUrl,normalizeUser,normalizeGiftEvent};
