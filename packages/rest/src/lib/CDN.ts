import {
	ALLOWED_EXTENSIONS,
	ALLOWED_SIZES,
	ALLOWED_STICKER_EXTENSIONS,
	DefaultRestOptions,
	ImageExtension,
	ImageSize,
	StickerExtension,
} from './utils/constants';

export interface BaseImageURLOptions {
	extension?: ImageExtension;
	size?: ImageSize;
}

export interface ImageURLOptions extends BaseImageURLOptions {
	dynamic?: boolean;
}

export interface MakeURLOptions {
	extension?: string | undefined;
	size?: ImageSize;
	allowedExtensions?: readonly string[];
}

/**
 * The CDN link builder
 */
export class CDN {
	public constructor(private readonly base: string = DefaultRestOptions.cdn) {}

	/**
	 * Generates an app asset URL for a client's asset.
	 * @param clientId The client id that has the asset
	 * @param assetHash The hash provided by Discord for this asset
	 * @param options Optional options for the asset
	 */
	public appAsset(clientId: string, assetHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/app-assets/${clientId}/${assetHash}`, options);
	}

	/**
	 * Generates an app icon URL for a client's icon.
	 * @param clientId The client id that has the icon
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public appIcon(clientId: string, iconHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/app-icons/${clientId}/${iconHash}`, options);
	}

	/**
	 * Generates an avatar URL, e.g. for a user or a webhook.
	 * @param id The id that has the icon
	 * @param avatarHash The hash provided by Discord for this avatar
	 * @param options Optional options for the avatar
	 */
	public avatar(id: string, avatarHash: string, options?: Readonly<ImageURLOptions>): string {
		return this.dynamicMakeURL(`/avatars/${id}/${avatarHash}`, avatarHash, options);
	}

	/**
	 * Generates a banner URL, e.g. for a user or a guild.
	 * @param id The id that has the banner splash
	 * @param bannerHash The hash provided by Discord for this banner
	 * @param options Optional options for the banner
	 */
	public banner(id: string, bannerHash: string, options?: Readonly<ImageURLOptions>): string {
		return this.dynamicMakeURL(`/banners/${id}/${bannerHash}`, bannerHash, options);
	}

	/**
	 * Generates an icon URL for a channel, e.g. a group DM.
	 * @param channelId The channel id that has the icon
	 * @param iconHash The hash provided by Discord for this channel
	 * @param options Optional options for the icon
	 */
	public channelIcon(channelId: string, iconHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/channel-icons/${channelId}/${iconHash}`, options);
	}

	/**
	 * Generates the default avatar URL for a discriminator.
	 * @param discriminator The discriminator modulo 5
	 */
	public defaultAvatar(discriminator: number): string {
		return this.makeURL(`/embed/avatars/${discriminator}`);
	}

	/**
	 * Generates a discovery splash URL for a guild's discovery splash.
	 * @param guildId The guild id that has the discovery splash
	 * @param splashHash The hash provided by Discord for this splash
	 * @param options Optional options for the splash
	 */
	public discoverySplash(guildId: string, splashHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/discovery-splashes/${guildId}/${splashHash}`, options);
	}

	/**
	 * Generates an emoji's URL for an emoji.
	 * @param emojiId The emoji id
	 * @param extension The extension of the emoji
	 */
	public emoji(emojiId: string, extension?: ImageExtension): string {
		return this.makeURL(`/emojis/${emojiId}`, { extension });
	}

	/**
	 * Generates a guild member avatar URL.
	 * @param guildId The id of the guild
	 * @param userId The id of the user
	 * @param avatarHash The hash provided by Discord for this avatar
	 * @param options Optional options for the avatar
	 */
	public guildMemberAvatar(
		guildId: string,
		userId: string,
		avatarHash: string,
		options?: Readonly<ImageURLOptions>,
	): string {
		return this.dynamicMakeURL(`/guilds/${guildId}/users/${userId}/avatars/${avatarHash}`, avatarHash, options);
	}

	/**
	 * Generates an icon URL, e.g. for a guild.
	 * @param id The id that has the icon splash
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public icon(id: string, iconHash: string, options?: Readonly<ImageURLOptions>): string {
		return this.dynamicMakeURL(`/icons/${id}/${iconHash}`, iconHash, options);
	}

	/**
	 * Generates a URL for the icon of a role
	 * @param roleId The id of the role that has the icon
	 * @param roleIconHash The hash provided by Discord for this role icon
	 * @param options Optional options for the role icon
	 */
	public roleIcon(roleId: string, roleIconHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/role-icons/${roleId}/${roleIconHash}`, options);
	}

	/**
	 * Generates a guild invite splash URL for a guild's invite splash.
	 * @param guildId The guild id that has the invite splash
	 * @param splashHash The hash provided by Discord for this splash
	 * @param options Optional options for the splash
	 */
	public splash(guildId: string, splashHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/splashes/${guildId}/${splashHash}`, options);
	}

	/**
	 * Generates a sticker URL.
	 * @param stickerId The sticker id
	 * @param extension The extension of the sticker
	 */
	public sticker(stickerId: string, extension?: StickerExtension): string {
		return this.makeURL(`/stickers/${stickerId}`, { allowedExtensions: ALLOWED_STICKER_EXTENSIONS, extension });
	}

	/**
	 * Generates a sticker pack banner URL.
	 * @param bannerId The banner id
	 * @param options Optional options for the banner
	 */
	public stickerPackBanner(bannerId: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/app-assets/710982414301790216/store/${bannerId}`, options);
	}

	/**
	 * Generates a team icon URL for a team's icon.
	 * @param teamId The team id that has the icon
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public teamIcon(teamId: string, iconHash: string, options?: Readonly<BaseImageURLOptions>): string {
		return this.makeURL(`/team-icons/${teamId}/${iconHash}`, options);
	}

	/**
	 * Constructs the URL for the resource, checking whether or not `hash` starts with `a_` if `dynamic` is set to `true`.
	 * @param route The base cdn route
	 * @param hash The hash provided by Discord for this icon
	 * @param options Optional options for the link
	 */
	private dynamicMakeURL(
		route: string,
		hash: string,
		{ dynamic = false, ...options }: Readonly<ImageURLOptions> = {},
	): string {
		return this.makeURL(route, dynamic && hash.startsWith('a_') ? { ...options, extension: 'gif' } : options);
	}

	/**
	 * Constructs the URL for the resource
	 * @param route The base cdn route
	 * @param options The extension/size options for the link
	 */
	private makeURL(
		route: string,
		{ allowedExtensions = ALLOWED_EXTENSIONS, extension = 'png', size }: Readonly<MakeURLOptions> = {},
	): string {
		extension = String(extension).toLowerCase();

		if (!allowedExtensions.includes(extension)) {
			throw new RangeError(`Invalid extension provided: ${extension}\nMust be one of: ${allowedExtensions.join(', ')}`);
		}

		if (size && !ALLOWED_SIZES.includes(size)) {
			throw new RangeError(`Invalid size provided: ${size}\nMust be one of: ${ALLOWED_SIZES.join(', ')}`);
		}

		const url = new URL(`${this.base}${route}.${extension}`);

		if (size) {
			url.searchParams.set('size', String(size));
		}

		return url.toString();
	}
}
