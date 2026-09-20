package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.SurfaceBase

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MyApplicationTheme { OfficialGtoApp() } }
    }
}

private data class OfficialLink(val title: String, val subtitle: String, val url: String)

@Composable
fun OfficialGtoApp() {
    val context = LocalContext.current
    val links = listOf(
        OfficialLink("Соревнования", "Календарь и результаты", "https://gto.com.ru/sorevnovaniya/"),
        OfficialLink("Новости Федерации", "Публикации пресс-службы", "https://gto.com.ru/novosti/"),
        OfficialLink("Книга рекордов", "Проверяемый официальный реестр", "https://gto.com.ru/rekordy/"),
        OfficialLink("Документы и правила", "Положения и дисциплины", "https://gto.com.ru/o-federacii/dokumenty/"),
        OfficialLink("Региональные федерации", "Адреса и контакты отделений", "https://gto.com.ru/#regional")
    )
    Scaffold(containerColor = SurfaceBase) { inset ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(inset).background(SurfaceBase),
            contentPadding = PaddingValues(18.dp, 28.dp, 18.dp, 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Column(
                    Modifier.fillMaxWidth().background(
                        Brush.linearGradient(listOf(Color(0xFF17365D), Color(0xFF101D2D))),
                        RoundedCornerShape(28.dp)
                    ).padding(22.dp)
                ) {
                    Text("ФЕДЕРАЦИЯ МНОГОБОРЬЯ ГТО РОССИИ", color = Color(0xFFFF777B), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(Modifier.height(18.dp))
                    Text("Твой старт\nначинается здесь", color = Color.White, fontSize = 31.sp, lineHeight = 35.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(12.dp))
                    Text("Официальные материалы без демонстрационных профилей, вымышленных трансляций и симуляции судейства.", color = Color(0xFFB9C8D8), fontSize = 13.sp, lineHeight = 19.sp)
                }
            }
            item {
                Row(Modifier.fillMaxWidth().background(Color(0xFF102B24), RoundedCornerShape(16.dp)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("✓", color = Color(0xFF5DE0A6), fontSize = 21.sp, fontWeight = FontWeight.Black)
                    Column(Modifier.padding(start = 12.dp)) {
                        Text("Только первоисточник", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Text("Каждый раздел открывается на gto.com.ru", color = Color(0xFF91A8A1), fontSize = 11.sp)
                    }
                }
            }
            item { Text("Официальные разделы", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 14.dp)) }
            items(links) { link ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF101D2D)),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth().clickable { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link.url))) }
                ) {
                    Row(Modifier.fillMaxWidth().padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(link.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text(link.subtitle, color = Color(0xFF8FA2B8), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                        Text("↗", color = Color(0xFF79ADFF), fontSize = 18.sp)
                    }
                }
            }
            item { Box(Modifier.fillMaxWidth().padding(top = 14.dp), contentAlignment = Alignment.Center) { Text("Источник данных: gto.com.ru", color = Color(0xFF708399), fontSize = 10.sp) } }
        }
    }
}

@Composable
fun GtoApp() = OfficialGtoApp()
