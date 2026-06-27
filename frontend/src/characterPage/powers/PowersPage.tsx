// removed unused React import (using automatic JSX runtime)
// PowerCard not used here; abilities are edited in a compact grid
import useCharacter from '../hooks/useCharacter'
import { useParams } from 'react-router-dom'
import './PowersPage.css'
import '../../modules/ClassPreviewSkills.css'
import ClassSkills from '../../modules/ClassSkills';

export default function PowersPage() {
  const { userId, charId } = useParams<{ userId: string; charId: string }>()
  const { character, loading, error } = useCharacter(userId, charId)

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>
  if (!character) return <div>Персонаж не найден</div>

  return (
    <main className="powers-page">
      <div className="skills-map">
        <ClassSkills CharacterID={{userId: userId as string, characterId: charId as string}} />
      </div>
    </main>
  )
}
