'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { TumblrSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tumblr.dto';
import { TumblrTagsSelect } from './tumblr.tags.select';
import { TumblrBlogSelect } from './tumblr.blog.select';
import { Checkbox } from '@gitroom/react/form/checkbox';

const TumblrComponent: FC = () => {
  const form = useSettings();
  return (
    <div className="flex flex-col">
      <Checkbox
        label="Enable Reblogs"
        className="mb-5"
        {...form.register('enable_reblogs', {value: true})}
        >
      </Checkbox>
      <TumblrBlogSelect {...form.register('blog')} />
      <TumblrTagsSelect label="Tags" {...form.register('tags')} />
    </div>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: TumblrComponent,
  CustomPreviewComponent: undefined,
  dto: TumblrSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 999999,
});
