package com.example

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.example.ui.theme.MyApplicationTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `read string from context`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Игры ГТО", appName)
    }

    @Test
    fun `test tournament overview renders and navigation works`() {
        composeTestRule.setContent {
            MyApplicationTheme {
                GtoApp()
            }
        }

        // Check hero title
        composeTestRule.onNodeWithText("Кубок Дальнего Востока").assertIsDisplayed()
        composeTestRule.onNodeWithTag("overview_hero_card").assertIsDisplayed()

        // Navigate to Leaderboard tab
        composeTestRule.onNodeWithTag("bottom_nav_leaderboard").performClick()
        composeTestRule.onNodeWithText("Таблица лидеров").assertIsDisplayed()

        // Navigate to Complexes tab
        composeTestRule.onNodeWithTag("bottom_nav_complexes").performClick()
        composeTestRule.onNodeWithText("Комплексы соревнований").assertIsDisplayed()

        // Navigate to Schedule tab
        composeTestRule.onNodeWithTag("bottom_nav_schedule").performClick()
        composeTestRule.onNodeWithText("Расписание заходов").assertIsDisplayed()
    }
}
