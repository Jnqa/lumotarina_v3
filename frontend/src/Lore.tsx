import { useParams } from 'react-router-dom';
import LoreLayout from './lore/loreLayout';

export default function Lore() {
  const { bookId } = useParams<{ bookId: string }>();
  return <LoreLayout initialBookId={bookId} />;
}
