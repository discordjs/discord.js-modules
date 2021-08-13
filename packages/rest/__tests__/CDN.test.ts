import { CDN } from '../src';

const base = 'https://discord.com';
const id = '123456';
const hash = 'abcdef';
const animatedHash = 'a_bcdef';
const defaultAvatar = 1234 % 5;

const cdn = new CDN(base);

test('appAsset default', () => {
	expect(cdn.appAsset(id, hash)).toBe(`${base}/app-assets/${id}/${hash}.png`);
});

test('appIcon default', () => {
	expect(cdn.appIcon(id, hash)).toBe(`${base}/app-icons/${id}/${hash}.png`);
});

test('defaultAvatar default', () => {
	expect(cdn.defaultAvatar(defaultAvatar)).toBe(`${base}/embed/avatars/${defaultAvatar}.png`);
});

test('discoverySplash default', () => {
	expect(cdn.discoverySplash(id, hash)).toBe(`${base}/discovery-splashes/${id}/${hash}.png`);
});

test('emoji default', () => {
	expect(cdn.emoji(id)).toBe(`${base}/emojis/${id}.png`);
});

test('emoji gif', () => {
	expect(cdn.emoji(id, 'gif')).toBe(`${base}/emojis/${id}.gif`);
});

test('groupDMIcon default', () => {
	expect(cdn.groupDMIcon(id, hash)).toBe(`${base}/channel-icons/${id}/${hash}.png`);
});

test('guildBanner default', () => {
	expect(cdn.guildBanner(id, hash)).toBe(`${base}/banners/${id}/${hash}.png`);
});

test('guildIcon default', () => {
	expect(cdn.guildIcon(id, hash)).toBe(`${base}/icons/${id}/${hash}.png`);
});

test('guildIcon dynamic-animated', () => {
	expect(cdn.guildIcon(id, animatedHash, { dynamic: true })).toBe(`${base}/icons/${id}/${animatedHash}.gif`);
});

test('guildIcon dynamic-not-animated', () => {
	expect(cdn.guildIcon(id, hash, { dynamic: true })).toBe(`${base}/icons/${id}/${hash}.png`);
});

test('splash default', () => {
	expect(cdn.splash(id, hash)).toBe(`${base}/splashes/${id}/${hash}.png`);
});

test('teamIcon default', () => {
	expect(cdn.teamIcon(id, hash)).toBe(`${base}/team-icons/${id}/${hash}.png`);
});

test('userAvatar default', () => {
	expect(cdn.userAvatar(id, animatedHash)).toBe(`${base}/avatars/${id}/${animatedHash}.png`);
});

test('userAvatar dynamic-animated', () => {
	expect(cdn.userAvatar(id, animatedHash, { dynamic: true })).toBe(`${base}/avatars/${id}/${animatedHash}.gif`);
});

test('userAvatar dynamic-not-animated', () => {
	expect(cdn.userAvatar(id, hash, { dynamic: true })).toBe(`${base}/avatars/${id}/${hash}.png`);
});

test('makeURL throws on invalid size', () => {
	// @ts-expect-error: Invalid size
	expect(() => cdn.userAvatar(id, animatedHash, { size: 5 })).toThrow(RangeError);
});

test('makeURL throws on invalid extension', () => {
	// @ts-expect-error: Invalid extension
	expect(() => cdn.userAvatar(id, animatedHash, { extension: 'tif' })).toThrow(RangeError);
});

test('makeURL valid size', () => {
	expect(cdn.userAvatar(id, animatedHash, { size: 512 })).toBe(`${base}/avatars/${id}/${animatedHash}.png?size=512`);
});
