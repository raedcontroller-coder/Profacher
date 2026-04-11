import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const url = new URL(req.url);
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");
    
    // Tenta pegar primeiro da URL (mais confiável) e depois do corpo
    const studentRa = url.searchParams.get("student_ra") || params.get("student_ra");
    const studentName = url.searchParams.get("student_name") || params.get("student_name");

    if (!socketId || !channelName) {
      return new NextResponse("Invalid socket_id or channel_name", { status: 400 });
    }

    let presenceData: any = {
      user_id: "",
      user_info: {}
    };

    // 1. Prioridade: Se houver parâmetros de Aluno (Convidado), trata como aluno
    // Isso permite que professores testem a prova no mesmo navegador.
    if (studentRa && studentName) {
      presenceData = {
        user_id: `student-${studentRa}`,
        user_info: {
          name: studentName,
          ra: studentRa,
          role: "student"
        }
      };
    } 
    // 2. Cenário Secundário: Professor Logado (Monitoramento)
    else if (session?.user) {
      presenceData = {
        user_id: (session.user as any).email || (session.user as any).id.toString(),
        user_info: {
          name: session.user.name,
          role: "teacher"
        }
      };
    } else {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Erro na auth do pusher:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
