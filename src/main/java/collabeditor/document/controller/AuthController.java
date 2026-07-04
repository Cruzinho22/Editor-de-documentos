package collabeditor.document.controller;

import collabeditor.document.dto.AuthRequest;
import collabeditor.document.dto.AuthResponse;
import collabeditor.document.service.UsuarioService;
import collabeditor.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    // Registra um novo usuário e retorna o token já gerado
    @PostMapping("/registrar")
    public ResponseEntity<AuthResponse> registrar(@RequestBody AuthRequest request) {
        usuarioService.registrar(request.getUsername(), request.getPassword());
        String token = jwtService.gerarToken(request.getUsername());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    // Autentica o usuário e retorna o token
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        UserDetails user = usuarioService.loadUserByUsername(request.getUsername());
        String token = jwtService.gerarToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token));
    }
}