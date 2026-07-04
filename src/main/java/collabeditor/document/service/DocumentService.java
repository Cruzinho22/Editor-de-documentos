package collabeditor.document.service;

import collabeditor.document.dto.EditMessage;
import collabeditor.document.model.DocumentEntity;
import collabeditor.document.repository.DocumentRepository;
import collabeditor.exception.BadRequestException;
import collabeditor.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
                .orElseThrow(() -> new NotFoundException("Documento não encontrado"));
    }

    public DocumentEntity findByName(String name){
        return this.documentRepository.findByName(name)
                .orElseThrow(()-> new BadRequestException("Documento não existe ou nome está incorreto"));
    }

    @Transactional
    public DocumentEntity save(DocumentEntity documentEntity) {
        return this.documentRepository.save(documentEntity);
    }

    public void delete(Long id) {
        DocumentEntity doc = findById(id);
        String usuarioAtual = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        if (!doc.getDono().equals(usuarioAtual)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão");
        }

        documentRepository.delete(doc);
    }

    public void replace(DocumentEntity documentEntity) {
        DocumentEntity newDocumentEntity = this.findById(documentEntity.getId());
        newDocumentEntity.setContent(documentEntity.getContent());
        documentRepository.save(newDocumentEntity);
    }

    @Transactional
    public DocumentEntity applyEdit(EditMessage message) {
        DocumentEntity doc = findById(message.getDocumentId());
        doc.setContent(message.getContent());
//        doc.setSenderId(message.getSenderId());
        return documentRepository.save(doc);
    }

}
