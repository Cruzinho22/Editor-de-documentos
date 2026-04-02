package collabeditor.document.controller;

import collabeditor.document.dto.EditMessage; // Movi o DTO para o domínio
import collabeditor.document.model.DocumentEntity;
import collabeditor.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // --- Fluxo Rest ---
    @GetMapping(path = "/{id}")
    ResponseEntity<DocumentEntity> findById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.findById(id));
    }

    @GetMapping
    ResponseEntity<List<DocumentEntity>> findAll(){
        return ResponseEntity.ok(documentService.findAll());
    }

    @PostMapping
    ResponseEntity<DocumentEntity> save(@RequestBody DocumentEntity documentEntity) {
        return ResponseEntity.ok(documentService.save(documentEntity));
    }

    @DeleteMapping(path = "/{id}")
    ResponseEntity<Void> delete(@PathVariable Long id) {
        documentService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PutMapping
    ResponseEntity<Void> update(@RequestBody DocumentEntity documentEntity) {
        documentService.replace(documentEntity);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}