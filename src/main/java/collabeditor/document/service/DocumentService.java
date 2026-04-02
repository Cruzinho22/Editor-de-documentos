package collabeditor.document.service;

import collabeditor.document.dto.EditMessage;
import collabeditor.document.model.DocumentEntity;
import collabeditor.document.repository.DocumentRepository;
import collabeditor.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;

    public List<DocumentEntity> findAll() {
        return this.documentRepository.findAll();
    }

    public DocumentEntity findById(long id) {
        return this.documentRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Documento não achada"));
    }

    @Transactional
    public DocumentEntity save(DocumentEntity documentEntity) {
        return this.documentRepository.save(documentEntity);
    }

    public void delete(Long id) {
        this.documentRepository.delete(findById(id));
    }

    public void replace(DocumentEntity documentEntity) {
        DocumentEntity newDocumentEntity = this.findById(documentEntity.getId());
        newDocumentEntity.setContent(documentEntity.getContent());
        documentRepository.save(newDocumentEntity);
    }

    @Transactional
    public DocumentEntity applyEdit(EditMessage message) {
        DocumentEntity doc = new DocumentEntity();
        doc.setContent(message.getContent());
        doc.setId(message.getDocumentId());
        return documentRepository.save(doc);
    }

}
