import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

const CONTEXT_CONTENT = {
  module: {
    title: 'Quitter ce module ?',
    description: 'Des modifications non sauvegardees ou un import en cours seront perdus.',
    confirmLabel: 'Quitter quand meme',
  },
  company: {
    title: 'Changer de societe ?',
    description: 'Les modifications en cours sur la societe actuelle seront abandonnees.',
    confirmLabel: 'Changer de societe',
  },
  navigation: {
    title: 'Navigation bloquee',
    description: 'Terminez ou annulez vos modifications/import en cours avant de continuer.',
    confirmLabel: 'Abandonner et continuer',
  },
};

export function UnsavedWarningDialog({ isOpen, context = 'navigation', onCancel, onConfirm }) {
  const content = CONTEXT_CONTENT[context] || CONTEXT_CONTENT.navigation;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      tone="warning"
      title={content.title}
      description={content.description}
      confirmLabel={content.confirmLabel}
      cancelLabel="Annuler"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
