import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { TumblrSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tumblr.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import fs from 'fs';

@Rules(
  'Tumblr can have 1 video per post (up to 10 minutes / 500 MB) or 30 photos.'
)
export class TumblrProvider extends SocialAbstract implements SocialProvider {

  identifier = 'tumblr';
  name = 'Tumblr';
  isBetweenSteps = false;
  scopes = ['basic', 'write']
  maxLength() {
    return 999999;
  }

  editor = 'normal' as const;
  dto = TumblrSettingsDto;

  REDIRECT_URL = `${
            process?.env.FRONTEND_URL?.indexOf('https') == -1
              ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
              : `${process?.env.FRONTEND_URL}`
          }/integrations/social/tumblr`;

  override handleErrors(body: string):
    | {
      type: 'refresh-token' | 'bad-body';
      value: string;
    }
    | undefined {
    return undefined;
  }

  async getUserInfo(accessToken: string): Promise<{name: string; picture: string; blogs: string[], primary_blog: string}> {
    const user_info_request = await (
      await fetch('https://api.tumblr.com/v2/user/info',{
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    ).json()

    const user_info = user_info_request.response.user

    const primary_blog: {name: string; primary: boolean;} = user_info.blogs.filter((blog: { primary: boolean; }) => blog.primary)[0]

    const avatar_request = await (
      await fetch(`https://api.tumblr.com/v2/blog/${primary_blog.name}/avatar/64`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
        })
    )
    
    return {
      name: user_info.name,
      picture: avatar_request.url,
      blogs: user_info.blogs.map((blog: {name: string}) => blog.name),
      primary_blog: primary_blog.name
    }
  }

  // @Tool({ description: 'Channels', dataSchema: [] })
  // Get list of user's blogs, always with the primary blog first.
  public async getBlogs(accessToken: string, params: any, id: string): Promise<string[]> {
    const userInfo = await(this.getUserInfo(accessToken))
    return [userInfo.primary_blog, ...userInfo.blogs.filter(blog => blog != userInfo.primary_blog)]
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in
    } = await (
      await this.fetch('https://api.tumblr.com/v2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams( {
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.TUMBLR_CLIENT_ID!,
          client_secret: process.env.TUMBLR_CLIENT_SECRET!,
        }),
      })
    ).json();

    const {name, picture} = await(this.getUserInfo(accessToken));

    return {
      id: name,
      name: name,
      username: name,
      picture,
      accessToken,
      refreshToken,
      expiresIn: expires_in
    }
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: 'https://www.tumblr.com/oauth2/authorize?' + new URLSearchParams({
        client_id: process.env.TUMBLR_CLIENT_ID,
        response_type: "code",
        redirect_uri: this.REDIRECT_URL,
        state,
        scope: this.scopes.join(' '),
      }).toString(),
        codeVerifier: makeId(10),
        state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string; refresh: string}) {
    const getToken = await(
      await fetch('https://api.tumblr.com/v2/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams ({
          grant_type : "authorization_code",
          code: params.code,
          client_id: process.env.TUMBLR_CLIENT_ID,
          client_secret: process.env.TUMBLR_CLIENT_SECRET,
          redirect_uri: this.REDIRECT_URL
        })
      }))

      const {access_token, expires_in, refresh_token, scope} = await(getToken).json()

      this.checkScopes(this.scopes, scope)

      const {name, picture} = await this.getUserInfo(access_token);

      return {
        id: name,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        picture,
        username: name
      }
    }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<TumblrSettingsDto>[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...theRest] = postDetails;
    var content_blocks: {type: string; media?: {identifier: string}[]; alt_text?: string; text?: string}[] = firstPost.media.flatMap(m => {
      return {
        type: (() => {
          switch (m.type) {
            case 'video': return "video"
            case 'image': return "image"
          }})(),
      media: [
        {
          identifier: m.path
        }
      ],
      alt_text: m.alt
    }})

    if (firstPost.message.length > 0) {
      content_blocks.push({
        type: "text",
        text: firstPost.message
      })
    }

    const formData = new FormData();
    formData.append('content', JSON.stringify(content_blocks));
    formData.append('tags', firstPost.settings.tags.map(tag => tag.value).join(","));
    formData.append('interactibility_reblog', firstPost.settings.enable_reblogs ? 'everyone' : 'noone');
    firstPost.media?.forEach(m => {
      formData.append(m.path, new Blob([fs.readFileSync(m.path) as BlobPart]), m.path)
    })

    const response = await (
      await fetch(`https://api.tumblr.com/v2/blog/${firstPost.settings.blog}/posts`, {
        method: "POST",
        headers: {
          'Content-Type': "multipart/form-data",
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      }
      )
    ).json()

    const post_info = await (
      await fetch (`https://api.tumblr.com/v2/blog/${firstPost.settings.blog}/posts`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: new URLSearchParams(
            {
              api_key: process.env.TUMBLR_CLIENT_ID,
              id: response.id
            }
          )
        }
      )
    ).json()


    return [
      {
        id: firstPost.id,
        postId: response.id,
        releaseURL: post_info.posts.get(0).post_url,
        status: 'success'
      }
    ]
  }
}