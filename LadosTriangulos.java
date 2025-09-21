/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.util.Scanner;
/**
 *
 * @author jsmit
 */
public class LadosTriangulos {
    public static void main(String[] args) {
        
        Scanner sc = new Scanner(System.in);
        //pedir los datos
        System.out.println("Ingrese el lado A: ");
        double a = sc.nextDouble();
        System.out.println("Ingrese el lado B: ");
        double b = sc.nextDouble();
        System.out.println("Ingrese el lado C: ");
        double c = sc.nextDouble();
        
    
        String tipo;
        
       if(a == b && b == c)  {

            tipo = "Equilatero";
            
            
        } else if (a == b || a == c || b == c){

                tipo = "Isoceles";
        } else {

            tipo = "Escaleno";
        }
            
        System.out.println("El triangulo es: " + tipo);
        
        // Agregar esto para pausar
        System.out.println("Presiona Enter para salir...");
        sc.nextLine(); // Limpiar el buffer
        sc.nextLine(); // Esperar Enter
    }
}
