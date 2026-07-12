-- CẢNH BÁO: Chạy file này sẽ xóa vĩnh viễn TOÀN BỘ tài khoản Auth
-- trong Supabase project hiện tại. Chỉ dùng khi muốn reset sạch tài khoản.

delete from auth.users
where id is not null;

-- Kiểm tra: kết quả phải bằng 0 sau khi chạy.
select count(*) as remaining_auth_users from auth.users;

-- Yêu cầu PostgREST làm mới trạng thái sau khi reset.
notify pgrst, 'reload schema';
