import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Label } from '@/components/ui/label.js';
import { Textarea } from '@/components/ui/textarea.js';
import { bootstrapSession } from '@/lib/session.js';
import { trpcClient, useTRPC } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import type { AllowedMediaMimeType, MediaSummary, Network } from '@sonskay/shared';
import { NETWORK_CAPABILITIES, allowedMediaMimeTypes, mostRestrictiveCapabilities } from '@sonskay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { rootRoute } from './root.js';

export const postComposeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/compose',
  beforeLoad: async () => {
    await bootstrapSession();
    if (!useAuthStore.getState().user) {
      throw redirect({ to: '/login' });
    }
  },
  component: PostComposerPage,
});

const NETWORK_LABELS: Record<Network, string> = {
  TWITTER: 'X / Twitter',
  BLUESKY: 'Bluesky',
};

interface ComposerItem {
  key: string;
  postItemId: string | null;
  text: string;
  media: MediaSummary[];
}

function createEmptyItem(): ComposerItem {
  return { key: crypto.randomUUID(), postItemId: null, text: '', media: [] };
}

function isAllowedMediaMimeType(mimeType: string): mimeType is AllowedMediaMimeType {
  return (allowedMediaMimeTypes as readonly string[]).includes(mimeType);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error as Error);
    reader.readAsDataURL(file);
  });
}

function PostComposerPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [postId, setPostId] = useState<string | null>(null);
  const [items, setItems] = useState<ComposerItem[]>([createEmptyItem()]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const accountsQuery = useQuery(trpc.socialAccounts.listAccounts.queryOptions());
  const draftsQuery = useQuery(trpc.posts.listPosts.queryOptions({ status: 'DRAFT' }));

  const selectedNetworks = (accountsQuery.data ?? [])
    .filter((account) => selectedAccountIds.includes(account.id))
    .map((account) => account.network);

  const capabilities =
    selectedNetworks.length > 0
      ? mostRestrictiveCapabilities(selectedNetworks.map((network) => NETWORK_CAPABILITIES[network]))
      : null;

  const createDraftMutation = useMutation(trpc.posts.createDraft.mutationOptions());
  const updatePostMutation = useMutation(trpc.posts.updatePost.mutationOptions());
  const uploadMediaMutation = useMutation(trpc.media.upload.mutationOptions());
  const deleteMediaMutation = useMutation(trpc.media.delete.mutationOptions());

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]
    );
  }

  function updateItemText(key: string, text: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, text } : item)));
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved as ComposerItem);
      return next;
    });
  }

  function startNewDraft() {
    setPostId(null);
    setItems([createEmptyItem()]);
    setSelectedAccountIds([]);
    setError(null);
    setSavedMessage(null);
  }

  async function handleEditDraft(draftId: string) {
    setError(null);
    setSavedMessage(null);
    try {
      const draft = await trpcClient.posts.getPost.query({ postId: draftId });
      setPostId(draft.id);
      setItems(
        draft.items.length > 0
          ? draft.items.map((item) => ({
              key: crypto.randomUUID(),
              postItemId: item.id,
              text: item.text,
              media: item.media,
            }))
          : [createEmptyItem()]
      );
      setSelectedAccountIds(draft.targets.map((target) => target.socialAccountId));
    } catch {
      setError('Could not load this draft.');
    }
  }

  /** Validates and persists the current form, returning the up-to-date items (with server ids) or `null` on failure. */
  async function saveDraft(): Promise<ComposerItem[] | null> {
    setError(null);

    if (selectedAccountIds.length === 0) {
      setError('Select at least one target network.');
      return null;
    }
    if (capabilities && items.length > 1 && !capabilities.supportsThread) {
      setError('One or more selected networks do not support threads.');
      return null;
    }
    if (capabilities && items.some((item) => item.text.length > capabilities.maxChars)) {
      setError(`Some items exceed the ${capabilities.maxChars} character limit.`);
      return null;
    }

    const payload = {
      items: items.map((item, index) => ({
        ...(item.postItemId ? { id: item.postItemId } : {}),
        orderIndex: index,
        text: item.text,
      })),
      socialAccountIds: selectedAccountIds,
    };

    try {
      const result = postId
        ? await updatePostMutation.mutateAsync({ postId, ...payload })
        : await createDraftMutation.mutateAsync(payload);

      const updatedItems = items.map((item, index) => ({
        ...item,
        postItemId: result.items[index]?.id ?? item.postItemId,
      }));
      setPostId(result.id);
      setItems(updatedItems);
      void queryClient.invalidateQueries({ queryKey: trpc.posts.listPosts.queryKey() });
      return updatedItems;
    } catch {
      setError('Could not save the draft.');
      return null;
    }
  }

  async function handleSaveDraft() {
    setSavedMessage(null);
    const saved = await saveDraft();
    if (saved) {
      setSavedMessage('Draft saved.');
    }
  }

  async function handleUploadImage(item: ComposerItem, file: File) {
    setError(null);
    if (!isAllowedMediaMimeType(file.type)) {
      setError('Unsupported image type.');
      return;
    }

    setUploadingKey(item.key);
    try {
      let postItemId = item.postItemId;
      if (!postItemId) {
        const saved = await saveDraft();
        postItemId = saved?.find((current) => current.key === item.key)?.postItemId ?? null;
        if (!postItemId) {
          return;
        }
      }

      const data = await fileToBase64(file);
      const media = await uploadMediaMutation.mutateAsync({
        postItemId,
        fileName: file.name,
        mimeType: file.type,
        data,
      });
      setItems((current) =>
        current.map((current_item) =>
          current_item.key === item.key ? { ...current_item, media: [...current_item.media, media] } : current_item
        )
      );
    } catch {
      setError('Could not upload this image.');
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleRemoveImage(item: ComposerItem, media: MediaSummary) {
    setError(null);
    try {
      await deleteMediaMutation.mutateAsync({ mediaId: media.id });
      setItems((current) =>
        current.map((current_item) =>
          current_item.key === item.key
            ? { ...current_item, media: current_item.media.filter((current_media) => current_media.id !== media.id) }
            : current_item
        )
      );
    } catch {
      setError('Could not remove this image.');
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
          <CardDescription>Pick up a saved draft or start a new one.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draftsQuery.data && draftsQuery.data.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {draftsQuery.data.map((draft) => (
                <li
                  key={draft.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {draft.itemCount} item{draft.itemCount > 1 ? 's' : ''} — saved{' '}
                    {new Date(draft.updatedAt).toLocaleString()}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleEditDraft(draft.id)}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No draft saved yet.</p>
          )}
          {postId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startNewDraft}
            >
              Start a new post
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose a post</CardTitle>
          <CardDescription>Write a post or thread and save it as a draft.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Target networks</Label>
            <div className="flex flex-col gap-2">
              {(accountsQuery.data ?? []).map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => toggleAccount(account.id)}
                  />
                  {NETWORK_LABELS[account.network]} — {account.handle}
                </label>
              ))}
              {accountsQuery.data && accountsQuery.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Connect a social account first.</p>
              ) : null}
            </div>
          </div>

          {items.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveItem(item.key, -1)}
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(item.key, 1)}
                  >
                    Move down
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.key)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <Textarea
                value={item.text}
                onChange={(event) => updateItemText(item.key, event.target.value)}
                placeholder="What's happening?"
              />
              {capabilities ? (
                <p
                  className={`text-xs ${
                    item.text.length > capabilities.maxChars ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {item.text.length} / {capabilities.maxChars} characters
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {item.media.map((media) => (
                  <div
                    key={media.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <img
                      src={media.url}
                      alt="Attached image"
                      className="h-16 w-16 rounded object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemoveImage(item, media)}
                    >
                      Remove image
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept={allowedMediaMimeTypes.join(',')}
                  disabled={
                    uploadingKey === item.key || (capabilities ? item.media.length >= capabilities.maxImages : false)
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                      void handleUploadImage(item, file);
                    }
                  }}
                />
                {capabilities ? (
                  <span className="text-xs text-muted-foreground">
                    {item.media.length} / {capabilities.maxImages} images
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            disabled={capabilities ? !capabilities.supportsThread : false}
            onClick={addItem}
          >
            Add thread item
          </Button>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {savedMessage ? <p className="text-sm text-muted-foreground">{savedMessage}</p> : null}

          <Button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={createDraftMutation.isPending || updatePostMutation.isPending}
          >
            {createDraftMutation.isPending || updatePostMutation.isPending ? 'Saving…' : 'Save draft'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
