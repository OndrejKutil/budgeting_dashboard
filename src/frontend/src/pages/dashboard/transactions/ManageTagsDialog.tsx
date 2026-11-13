import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { tagsApi } from '@/lib/api/endpoints';
import type { Tag } from '@/lib/api/types';

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  /** Called after a tag is deleted so an open form can drop it from its selection. */
  onTagDeleted: (tagId: number) => void;
}

export function ManageTagsDialog({ open, onOpenChange, tags, onTagDeleted }: ManageTagsDialogProps) {
  const { t } = useUser();
  const queryClient = useQueryClient();
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  const stopEditing = () => {
    setEditingTagId(null);
    setEditingTagName('');
  };

  const saveRename = (tagId: number) => {
    const name = editingTagName.trim();
    if (!name) return;
    tagsApi
      .update(tagId, { tag_name: name })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['tags'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
        stopEditing();
      })
      .catch(() => toast({ title: t('pages.transactions.renameTagFailed'), variant: 'destructive' }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next);
        if (!next) stopEditing();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('pages.transactions.manageTagsTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('pages.transactions.manageTagsTitle')}</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto py-2 pr-1">
          {tags.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('pages.transactions.noTagsYet')}</p>
          )}
          {tags.map(tag => (
            <div key={tag.tags_id_pk} className="group flex items-center gap-2 border-b border-border py-1 last:border-0">
              {editingTagId === tag.tags_id_pk ? (
                <>
                  <Input
                    value={editingTagName}
                    aria-label={tag.tag_name}
                    onChange={e => setEditingTagName(e.target.value)}
                    className="h-8 flex-1 text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveRename(tag.tags_id_pk);
                      if (e.key === 'Escape') stopEditing();
                    }}
                  />
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => saveRename(tag.tags_id_pk)}>
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={stopEditing}>
                    {t('common.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{tag.tag_name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${t('common.edit')}: ${tag.tag_name}`}
                    className="h-7 w-7 text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                    onClick={() => {
                      setEditingTagId(tag.tags_id_pk);
                      setEditingTagName(tag.tag_name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${t('common.delete')}: ${tag.tag_name}`}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('pages.transactions.deleteTagTitle', { name: tag.tag_name })}</AlertDialogTitle>
                        <AlertDialogDescription>{t('pages.transactions.deleteTagDescription')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            tagsApi
                              .delete(tag.tags_id_pk)
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ['tags'] });
                                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                                queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
                                onTagDeleted(tag.tags_id_pk);
                              })
                              .catch(() => toast({ title: t('pages.transactions.deleteTagFailed'), variant: 'destructive' }));
                          }}
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
