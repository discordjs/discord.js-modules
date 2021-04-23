import { ALLOWED_EXTENSIONS, ALLOWED_SIZES, DefaultRestOptions, ImageExtension, ImageSize } from './utils/constants';

export interface ImageURLOptions {
	extension?: ImageExtension;
	size?: ImageSize;
	dynamic?: boolean;
}

/**
 * The CDN link builder
 */
export class CDN {
	public constructor(private readonly base: string = DefaultRestOptions.cdn) {}

	/**
	 * Generates an app asset URL for a client's asset.
	 * @param clientID The client ID that has the asset
	 * @param assetHash The hash provided by Discord for this asset
	 * @param options Optional options for the asset
	 */
	public appAsset(clientID: string, assetHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/app-assets/${clientID}/${assetHash}`, options);
	}

	/**
	 * Generates an app icon URL for a client's icon.
	 * @param clientID The client ID that has the icon
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public appIcon(clientID: string, iconHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/app-icons/${clientID}/${iconHash}`, options);
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
	 * @param guildID The guild ID that has the discovery splash
	 * @param splashHash The hash provided by Discord for this splash
	 * @param options Optional options for the splash
	 */
	public discoverySplash(guildID: string, splashHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/discovery-splashes/${guildID}/${splashHash}`, options);
	}

	/**
	 * Generates an emoji's URL for an emoji.
	 * @param emojiID The emoji ID
	 * @param extension The extension of the emoji
	 */
	public emoji(emojiID: string, extension?: ImageExtension): string {
		return this.makeURL(`/emojis/${emojiID}`, { extension });
	}

	/**
	 * Generates a group DM icon URL for a group DM.
	 * @param channelID The group channel ID that has the icon
	 * @param iconHash The hash provided by Discord for this group DM channel
	 * @param options Optional options for the icon
	 */
	public groupDMIcon(channelID: string, iconHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/channel-icons/${channelID}/${iconHash}`, options);
	}

	/**
	 * Generates a banner URL for a guild's banner.
	 * @param guildID The guild ID that has the banner splash
	 * @param bannerHash The hash provided by Discord for this banner
	 * @param options Optional options for the banner
	 */
	public guildBanner(guildID: string, bannerHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/banners/${guildID}/${bannerHash}`, options);
	}

	/**
	 * Generates an icon URL for a guild's icon.
	 * @param guildID The guild ID that has the icon splash
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public guildIcon(guildID: string, iconHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/icons/${guildID}/${iconHash}`, options);
	}

	/**
	 * Generates a guild invite splash URL for a guild's invite splash.
	 * @param guildID The guild ID that has the invite splash
	 * @param splashHash The hash provided by Discord for this splash
	 * @param options Optional options for the splash
	 */
	public splash(guildID: string, splashHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/splashes/${guildID}/${splashHash}`, options);
	}

	/**
	 * Generates a team icon URL for a team's icon.
	 * @param teamID The team ID that has the icon
	 * @param iconHash The hash provided by Discord for this icon
	 * @param options Optional options for the icon
	 */
	public teamIcon(teamID: string, iconHash: string, options?: ImageURLOptions): string {
		return this.makeURL(`/team-icons/${teamID}/${iconHash}`, options);
	}

	/**
	 * Generates a user avatar URL for a user's avatar.
	 * @param userID The user ID that has the icon
	 * @param avatarHash The hash provided by Discord for this avatar
	 * @param options Optional options for the avatar
	 */
	public userAvatar(userID: string, avatarHash: string, { dynamic = false, ...options }: ImageURLOptions = {}): string {
		if (dynamic && avatarHash.startsWith('a_')) {
			options.extension = 'gif';
		}

		return this.makeURL(`/avatars/${userID}/${avatarHash}`, options);
	}

	/**
	 * Constructs the URL for the resource
	 * @param base The base cdn route
	 * @param options The extension/size options for the link
	 */
	private makeURL(base: string, { extension = 'png', size }: ImageURLOptions = {}): string {
		extension = String(extension).toLowerCase() as ImageExtension;

		if (!ALLOWED_EXTENSIONS.includes(extension)) {
			throw new RangeError(
				`Invalid extension provided: ${extension}\nMust be one of: ${ALLOWED_EXTENSIONS.join(', ')}`,
			);
		}

		if (size && !ALLOWED_SIZES.includes(size)) {
			throw new RangeError(`Invalid size provided: ${size}\nMust be one of: ${ALLOWED_SIZES.join(', ')}`);
		}

		const url = new URL(`${this.base}${base}.${extension}`);

		if (size) {
			url.searchParams.set('size', String(size));
		}

		return url.toString();
	}
}
