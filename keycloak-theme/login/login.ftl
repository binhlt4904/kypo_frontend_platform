<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>
    <#if section = "header">
        <#-- intentionally empty: the brand row + heading are rendered inside
             section="form" instead, and #kc-page-title is hidden via CSS -->
    <#elseif section = "form">

        <#-- Background battle arena: isometric attackers striking servers,
             with a repair crew running out to patch them. Canvas-rendered,
             position:fixed via CSS so it fills the viewport even though
             it's nested inside the card markup. -->
        <div id="arenaBg">
            <canvas id="arena" width="680" height="380"></canvas>
        </div>

        <div class="card-inner">

        <div class="brand">
            <div class="brand-mark">V</div>
            <div class="brand-text">
                <div class="t1">VƯỜN <span style="color:var(--cyan)">TRẺ</span></div>
                <div class="t2">${msg("brandTag")}</div>
            </div>
        </div>

        <div class="heading">${msg("loginHeadingHtml")?no_esc}</div>
        <div class="subheading">${msg("loginSubtitle")}</div>

        <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="field">
                <label for="username">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                    <span class="req">*</span>
                </label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <#if usernameEditDisabled??>
                        <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username"
                               value="${(login.username!'')}" type="text" disabled />
                    <#else>
                        <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username"
                               value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                               placeholder="crczp-admin"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                    </#if>
                </div>
                <#if messagesPerField.existsError('username','password')>
                    <span id="input-error" style="display:block;margin-top:6px;color:var(--red);font-size:11.5px;" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="field">
                <label for="password">${msg("password")} <span class="req">*</span></label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <input tabindex="2" id="password" class="${properties.kcInputClass!} has-toggle" name="password"
                           type="password" autocomplete="off" placeholder="••••••••••••"
                           aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                    <button type="button" class="eye-toggle" id="eyeToggle" aria-label="Show/hide password">
                        <svg id="eyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>

            <div class="row-between">
                <#if realm.rememberMe && !usernameHidden??>
                    <label class="remember">
                        <#if login.rememberMe??>
                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked>
                        <#else>
                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox">
                        </#if>
                        ${msg("rememberMe")}
                    </label>
                <#else>
                    <span></span>
                </#if>
                <#if realm.resetPasswordAllowed>
                    <a class="forgot" tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                </#if>
            </div>

            <input type="hidden" id="id-hidden-input" name="credentialId"
                   <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if> />

            <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} btn-primary"
                    tabindex="4" name="login" id="kc-login" type="submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="#031318" stroke-width="2.4" width="14" height="14"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                ${msg("doLogIn")}
            </button>
        </form>

        <#if realm.password && social.providers?? && social.providers?has_content>
            <div class="divider"><div class="line"></div><span>OR</span><div class="line"></div></div>
            <#list social.providers as p>
                <a href="${p.loginUrl}" class="btn-sso">${p.displayName}</a>
            </#list>
        </#if>

        <#if realm.password && realm.registrationAllowed && !usernameHidden??>
            <div class="footer-note">${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></div>
        </#if>

        <div class="status-line"><span class="dot"></span> <span id="hud">${msg("statusLine")}</span></div>

        </div><#-- /.card-inner -->

    </#if>
</@layout.registrationLayout>
