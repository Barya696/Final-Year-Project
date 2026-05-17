package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Chapter;
import td.universite_ndjamena.backend.repository.ChapterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

    public List<Chapter> getAllChapters() {
        return chapterRepository.findAll();
    }

    public Optional<Chapter> getChapterById(Long id) {
        return chapterRepository.findById(id);
    }

    public List<Chapter> getChaptersByCourse(Long courseId) {
        return chapterRepository.findByCourseId(courseId);
    }

    public Chapter createChapter(Chapter chapter) {
        return chapterRepository.save(chapter);
    }

    public Chapter updateChapter(Long id, Chapter chapter) {
        Optional<Chapter> existing = chapterRepository.findById(id);
        if (existing.isPresent()) {
            Chapter ch = existing.get();
            if (chapter.getChapterName() != null) {
                ch.setChapterName(chapter.getChapterName());
            }
            if (chapter.getChapterNumber() != null) {
                ch.setChapterNumber(chapter.getChapterNumber());
            }
            return chapterRepository.save(ch);
        }
        throw new RuntimeException("Chapter not found");
    }

    public void deleteChapter(Long id) {
        chapterRepository.deleteById(id);
    }

    public void deleteChaptersByCourse(Long courseId) {
        List<Chapter> chapters = chapterRepository.findByCourseId(courseId);
        chapterRepository.deleteAll(chapters);
    }
}
