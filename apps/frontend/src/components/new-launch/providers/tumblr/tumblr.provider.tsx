'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/new-launch/finisher/thread.finisher';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { TumblrSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tumblr.dto';
import { Input } from '@gitroom/react/form/input';
import { Ticks } from 'chart.js';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

const whoCanReply = [
  {
    label: 'Everyone',
    value: 'everyone',
  },
  {
    label: 'Accounts you follow',
    value: 'following',
  },
  {
    label: 'Mentioned accounts',
    value: 'mentionedUsers',
  },
  {
    label: 'Subscribers',
    value: 'subscribers',
  },
  {
    label: 'Verified accounts',
    value: 'verified',
  },
];

const SettingsComponent = () => {
  const t = useT();
  const { register, watch, setValue } = useSettings();

  return (
    <>
      <Checkbox
        label={t(
          'enable_reblogs',
          'Enable Reblogs'
        )}
        className="mb-5"
        {...register('enable_reblogs', {value: true})}
        >
      </Checkbox>
      <Select
        label={t(
          'blog',
          'Blog'
        )}
        className="mb-5"
        hideErrors={true}
        {...register('who_can_reply_post', {
          value: 'everyone',
        })}
      >
        {whoCanReply.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Input
        label={t(
          'tags',
          "Comma-Separated List of Tags"
        )}
        {...register('tags')}
        />
      <ThreadFinisher />
    </>
  );
};

// TODO:
// Check video file size
// List blogs
export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: TumblrSettingsDto,
  checkValidity: async (posts, settings, additionalSettings: any) => {
    const premium =
      additionalSettings?.find((p: any) => p?.title === 'Verified')?.value ||
      false;
    if (posts?.some((p) => (p?.length ?? 0) > 30)) {
      return 'There can be maximum 30 pictures in a post.';
    }
    if (
      posts?.some(
        (p) => p?.some((m) => (m?.path?.indexOf?.('mp4') ?? -1) > -1) && (p?.length ?? 0) > 1
      )
    ) {
      return 'There can be maximum 1 video in a post.';
    }
    for (const load of posts?.flatMap((p) => p?.flatMap((a) => a?.path)) ?? []) {
      if ((load?.indexOf?.('mp4') ?? -1) > -1) {
        const isValid = await checkVideoDuration(load, 600);
        if (!isValid) {
          return 'Video duration must be less than or equal to 600 seconds.';
        }
      }
    }
    return true;
  },
  maximumCharacters: (settings) => {
    if (settings?.[0]?.value) {
      return 4000;
    }
    return 280;
  },
});

const checkVideoDuration = async (
  url: string,
  duration: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      // Check if the duration is less than or equal to 140 seconds
      if (video.duration < duration) {
        resolve(true); // Video duration is acceptable
      } else {
        resolve(false); // Video duration exceeds 140 seconds
      }
    };
    video.onerror = () => {
      reject(new Error('Failed to load video metadata.'));
    };
  });
};
