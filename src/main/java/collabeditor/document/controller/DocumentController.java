package collabeditor.document.controller;

import collabeditor.document.dto.CriarDocumento;
import collabeditor.document.dto.EditMessage;
import collabeditor.document.model.DocumentEntity;
import collabeditor.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @GetMapping(path ="/name/{name}")
    ResponseEntity<DocumentEntity> findByName(@PathVariable String name){
        return ResponseEntity.ok(documentService.findByName(name));
    }

    @GetMapping
    ResponseEntity<List<DocumentEntity>> findAll(){
        return ResponseEntity.ok(documentService.findAll());
    }

    @PostMapping("atualizarDocumento")
    ResponseEntity<DocumentEntity> save(@RequestBody EditMessage editMessage) {
        return ResponseEntity.ok(documentService.applyEdit(editMessage));
    }

    @PostMapping(path = "criarDocumento")
    ResponseEntity<DocumentEntity> saveNewDocument(@RequestBody CriarDocumento criarDocumento) {
        DocumentEntity documentEntity = new DocumentEntity();
        // documentEntity.setId(...)  <- NÃO FAÇA ISSO MAIS
        documentEntity.setName(criarDocumento.getName());
        documentEntity.setContent("");

        // O método .save() retorna a entidade com o ID que o banco acabou de criar
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